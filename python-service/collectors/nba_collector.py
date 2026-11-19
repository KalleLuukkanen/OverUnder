"""
Load NBA player box scores (and the upcoming schedule) from the Kaggle dataset
"eoinamoore/historical-nba-data-and-player-box-scores" (CC0, refreshed nightly) into Postgres.

Everything is upserted, so re-running is safe:
    python -m collectors.nba_collector                     # current + previous season
    python -m collectors.nba_collector --seasons 2026-27   # just the current season (daily refresh)
    python -m collectors.nba_collector --since 1996-97     # every season from 1996-97 to now (backfill)

Env vars:
    KAGGLE_USERNAME, KAGGLE_KEY (or KAGGLE_API_TOKEN) - read by kagglehub
    PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT     - DB connection (standard libpq vars)
"""

import argparse
import csv
import os
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date, datetime
from zoneinfo import ZoneInfo

import kagglehub
import psycopg

from collectors.nba_teams import TEAMS

DATASET = "eoinamoore/historical-nba-data-and-player-box-scores"
EASTERN = ZoneInfo("America/New_York")  # dataset times are US Eastern without an offset

# nba.com game ids look like 0022600226: [2] = game type, [3:5] = season start year
# 1 = preseason, 2 = regular season, 3 = All-Star, 4 = playoffs, 5 = play-in, 6 = NBA Cup final
INCLUDED_GAME_TYPES = {"2", "4", "5", "6"}

# game types counted in season / career totals, like official stats (play-in and Cup final don't count)
SEASON_TYPES = {"2": "regular", "4": "playoffs"}
TOTAL_STATS = ("pts", "reb", "ast", "stl", "blk", "tov", "fgm", "fga", "fg3m", "fg3a", "ftm", "fta")

# team nickname -> id ('Lakers' -> LAL id), some seasons in the dataset are missing playerteamId
TEAM_BY_NICKNAME = {
    " ".join(name.split()[i:]): tid
    for tid, (_, name) in TEAMS.items()
    for i in range(1, len(name.split()))
}
# old nicknames of franchises that have since moved or renamed
TEAM_BY_NICKNAME.update({
    "SuperSonics": 1610612760,  # Seattle -> Oklahoma City 2008
    "Bobcats": 1610612766,      # Charlotte 2004-2014
    "Bullets": 1610612764,      # Washington, renamed Wizards 1997
})
NEW_ORLEANS_HORNETS = range(2002, 2013)  # season start years when 'Hornets' meant New Orleans

# abbreviations of old team names, any other name uses the team's current abbreviation
OLD_ABBREVIATIONS = {
    "Seattle SuperSonics": "SEA",
    "New Jersey Nets": "NJN",
    "Vancouver Grizzlies": "VAN",
    "Charlotte Bobcats": "CHA",
    "New Orleans Hornets": "NOH",
    "New Orleans/Oklahoma City Hornets": "NOK",
    "Oklahoma City Hornets": "NOK",  # the dataset's name for New Orleans' Katrina seasons 2005-07
    "Washington Bullets": "WAS",
}


# ---------- seasons ----------

def season_string(start_year: int) -> str:
    return f"{start_year}-{(start_year + 1) % 100:02d}"


def current_season(today: date | None = None) -> str:
    """NBA seasons start in October: Nov 2026 -> '2026-27', Mar 2026 -> '2025-26'."""
    today = today or date.today()
    start_year = today.year if today.month >= 10 else today.year - 1
    return season_string(start_year)


def previous_season(season: str) -> str:
    return season_string(int(season[:4]) - 1)


def normalize_game_id(raw: str) -> str:
    return raw.strip().zfill(10)


def game_season(game_id: str) -> str:
    # 2-digit year: the league started in 1946, so 46-99 are 1900s
    yy = int(game_id[3:5])
    return season_string(1900 + yy if yy >= 46 else 2000 + yy)


def wanted(game_id: str, seasons: set[str]) -> bool:
    return game_id[2] in INCLUDED_GAME_TYPES and game_season(game_id) in seasons


def team_from_nickname(nickname: str, season: str) -> int:
    """Team id from a nickname ('Lakers'), 0 if unknown. 'Hornets' was New Orleans 2002-2013, Charlotte otherwise."""
    nickname = nickname.strip()
    if nickname == "Hornets" and int(season[:4]) in NEW_ORLEANS_HORNETS:
        return 1610612740
    return TEAM_BY_NICKNAME.get(nickname, 0)


def team_abbreviation(team_id: int, name: str, season: str) -> str:
    """Abbreviation of the team's name in that season ('Seattle SuperSonics' -> 'SEA')."""
    # the original Charlotte Hornets (until 2002) went by CHH, today's Hornets are CHA
    if name == "Charlotte Hornets" and season < "2002-03":
        return "CHH"
    return OLD_ABBREVIATIONS.get(name, TEAMS[team_id][0])


# ---------- parsing ----------

@contextmanager
def download(name: str) -> Iterator[str]:
    """Download a dataset file, yield its path, then delete it.
    kagglehub caches every dataset version, which would add ~370 MB per day in a long-running container."""
    print(f"Downloading {name}...")
    path = kagglehub.dataset_download(DATASET, path=name)
    try:
        yield path
    finally:
        os.remove(path)


def parse_minutes(value: str) -> float:
    """'30.666666666666668' -> 30.67, '36:16' -> 36.27, '' -> 0."""
    value = value.strip()
    if not value:
        return 0.0
    if ":" in value:
        mins, secs = value.split(":", 1)
        return round(int(mins) + int(secs or 0) / 60, 2)
    return round(float(value), 2)


def start_time(value: str) -> datetime | None:
    """'2027-03-17 19:30:00' (US Eastern) -> aware datetime, saved as UTC by Postgres. Date only -> None."""
    value = value.strip()
    if len(value) < 16:
        return None
    return datetime.fromisoformat(value[:19]).replace(tzinfo=EASTERN)


def to_int(value: str) -> int:
    return int(float(value)) if value.strip() else 0


def add_to_season_totals(totals: dict, game_id: str, r: dict) -> None:
    """Add one box score line to the player's season totals (every season, not just the synced ones)."""
    season_type = SEASON_TYPES.get(game_id[2])
    if season_type is None:
        return
    minutes = parse_minutes(r["numMinutes"])
    stats = {
        "pts": to_int(r["points"]), "reb": to_int(r["reboundsTotal"]), "ast": to_int(r["assists"]),
        "stl": to_int(r["steals"]), "blk": to_int(r["blocks"]), "tov": to_int(r["turnovers"]),
        "fgm": to_int(r["fieldGoalsMade"]), "fga": to_int(r["fieldGoalsAttempted"]),
        "fg3m": to_int(r["threePointersMade"]), "fg3a": to_int(r["threePointersAttempted"]),
        "ftm": to_int(r["freeThrowsMade"]), "fta": to_int(r["freeThrowsAttempted"]),
    }
    # DNP rows have no minutes and no stats. Old seasons can lack minutes, so stats alone also count as played
    if minutes == 0 and not any(stats.values()):
        return
    key = (to_int(r["personId"]), game_season(game_id), season_type)
    t = totals.get(key)
    if t is None:
        t = totals[key] = {
            "player_id": key[0], "season": key[1], "season_type": key[2],
            "games": 0, "minutes_games": 0, "minutes": 0.0, "first_game": {},
            **{s: 0 for s in TOTAL_STATS},
        }
    t["games"] += 1
    if minutes > 0:
        t["minutes_games"] += 1
        t["minutes"] += minutes
    for s in TOTAL_STATS:
        t[s] += stats[s]
    # remember when the player first played for each team, to list teams in order
    team_id = to_int(r["playerteamId"]) or team_from_nickname(r["playerteamName"], game_season(game_id))
    day = r["gameDateTimeEst"][:10]
    if team_id in TEAMS and (team_id not in t["first_game"] or day < t["first_game"][team_id]):
        t["first_game"][team_id] = day


def opt_int(value: str) -> int | None:
    """'81' -> 81, '' / 'Undrafted' / '0' / '-1' -> None."""
    try:
        number = int(float(value))
    except ValueError:
        return None
    return number if number > 0 else None


def opt_text(value: str) -> str | None:
    return value.strip() or None


def position(r: dict) -> str | None:
    """guard/forward/center flags -> 'G', 'F', 'C', 'G-F' or 'F-C'."""
    parts = [p for flag, p in (("guard", "G"), ("forward", "F"), ("center", "C")) if r[flag].strip() == "1"]
    return "-".join(parts) or None


def read_players() -> list[dict]:
    """Bio of every player in the dataset (height, weight, school, draft...)."""
    players = []
    with download("Players.csv") as path, open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            player_id = opt_int(r["personId"])
            if player_id is None:
                continue
            birth = r["birthDate"].strip()[:10]
            # undrafted players have -1 as draft year: store their first season with no round = 'Undrafted'
            draft_year = opt_int(r["draftYear"])
            if r["draftYear"].strip() == "-1":
                draft_year = opt_int(r["fromYear"])
            players.append({
                "id": player_id,
                "birth_date": date.fromisoformat(birth) if birth else None,
                "country": opt_text(r["country"]),
                "school": opt_text(r["school"]),
                "height_inches": opt_int(r["heightInches"]),
                "weight_lbs": opt_int(r["bodyWeightLbs"]),
                "jersey": opt_text(r["jersey"]),
                "position": position(r),
                "draft_year": draft_year,
                "draft_round": opt_int(r["draftRound"]),
                "draft_number": opt_int(r["draftNumber"]),
                "from_year": opt_int(r["fromYear"]),
            })
    print(f"  {len(players)} player bios")
    return players


def read_box_scores(path: str, seasons: set[str]) -> tuple[list[dict], list[dict]]:
    """Box scores of the given seasons + season totals of every season in the dataset (PlayerStatistics.csv)."""
    rows = []
    totals: dict = {}
    skipped_dnp = 0
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            game_id = normalize_game_id(r["gameId"])
            add_to_season_totals(totals, game_id, r)
            if not wanted(game_id, seasons):
                continue
            season = game_season(game_id)
            team_id = to_int(r["playerteamId"]) or team_from_nickname(r.get("playerteamName", ""), season)
            opp_id = to_int(r["opponentteamId"]) or team_from_nickname(r.get("opponentteamName", ""), season)
            if team_id not in TEAMS or opp_id not in TEAMS or not r["gameDateTimeEst"]:
                continue
            minutes = parse_minutes(r["numMinutes"])
            if minutes == 0:  # DNP / inactive: not a played game for hit rates
                skipped_dnp += 1
                continue
            is_home = r["home"] == "1"
            rows.append({
                "player_id": int(r["personId"]),
                "player_name": f"{r['firstName']} {r['lastName']}".strip(),
                "game_id": game_id,
                "game_date": date.fromisoformat(r["gameDateTimeEst"][:10]),
                "start_time": start_time(r["gameDateTimeEst"]),
                "season": season,
                "team_id": team_id,
                "opponent_id": opp_id,
                "home_team_id": team_id if is_home else opp_id,
                "away_team_id": opp_id if is_home else team_id,
                "is_home": is_home,
                "minutes": minutes,
                "pts": to_int(r["points"]),
                "reb": to_int(r["reboundsTotal"]),
                "ast": to_int(r["assists"]),
                "stl": to_int(r["steals"]),
                "blk": to_int(r["blocks"]),
                "tov": to_int(r["turnovers"]),
                "fgm": to_int(r["fieldGoalsMade"]),
                "fga": to_int(r["fieldGoalsAttempted"]),
                "fg3m": to_int(r["threePointersMade"]),
                "fg3a": to_int(r["threePointersAttempted"]),
                "ftm": to_int(r["freeThrowsMade"]),
                "fta": to_int(r["freeThrowsAttempted"]),
            })
    print(f"  {len(rows)} box scores ({skipped_dnp} DNP rows skipped)")
    rows.sort(key=lambda r: r["game_date"])

    season_totals = []
    for t in totals.values():
        first_game = t.pop("first_game")
        t["teams"] = "/".join(TEAMS[tid][0] for tid in sorted(first_game, key=first_game.get))
        t["minutes"] = round(t["minutes"], 2)
        season_totals.append(t)
    print(f"  {len(season_totals)} player seasons")
    return rows, season_totals


# TeamStatistics.csv column -> nba_team_game column
TEAM_GAME_COLUMNS = {
    "q1Points": "q1", "q2Points": "q2", "q3Points": "q3", "q4Points": "q4",
    "ot1Points": "ot1", "ot2Points": "ot2", "otAllPoints": "ot_all",
    "seasonWins": "season_wins", "seasonLosses": "season_losses",
    "fieldGoalsMade": "fgm", "fieldGoalsAttempted": "fga",
    "threePointersMade": "fg3m", "threePointersAttempted": "fg3a",
    "freeThrowsMade": "ftm", "freeThrowsAttempted": "fta",
    "reboundsOffensive": "reb_off", "reboundsDefensive": "reb_def", "reboundsTotal": "reb",
    "assists": "ast", "steals": "stl", "blocks": "blk", "turnovers": "tov", "foulsPersonal": "fouls",
    "pointsInThePaint": "points_paint", "pointsFastBreak": "points_fast_break",
    "pointsSecondChance": "points_second_chance", "pointsFromTurnovers": "points_off_turnovers",
    "benchPoints": "points_bench", "biggestLead": "biggest_lead", "biggestScoringRun": "biggest_run",
    "leadChanges": "lead_changes", "timesTied": "times_tied",
}


def opt_count(value: str) -> int | None:
    """Like opt_int but 0 is a real value (0 OT points, 0 lead changes): '' -> None, '0' -> 0."""
    try:
        return int(float(value))
    except ValueError:
        return None


def read_team_stats(path: str, seasons: set[str]) -> tuple[list[dict], list[dict]]:
    """Quarter scores, team totals and season records of the given seasons' played games (TeamStatistics.csv),
    + every team's name in each of those seasons ('Seattle SuperSonics' in 2007-08)."""
    rows = []
    names: dict[tuple[int, str], str] = {}
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            game_id = normalize_game_id(r["gameId"])
            team_id = opt_count(r["teamId"])
            if not wanted(game_id, seasons) or team_id not in TEAMS:
                continue
            row = {"game_id": game_id, "team_id": team_id}
            for src, col in TEAM_GAME_COLUMNS.items():
                row[col] = opt_count(r.get(src, ""))
            rows.append(row)
            name = f"{r.get('teamCity', '').strip()} {r.get('teamName', '').strip()}".strip()
            if name:
                names[(team_id, game_season(game_id))] = name
    team_seasons = [
        {"team_id": tid, "season": season, "name": name, "abbreviation": team_abbreviation(tid, name, season)}
        for (tid, season), name in names.items()
    ]
    old = sorted({f"{t['abbreviation']} {t['name']}" for t in team_seasons if t["name"] != TEAMS[t["team_id"]][1]})
    print(f"  {len(rows)} team game lines, names differing from today: {', '.join(old) or 'none'}")
    return rows, team_seasons


def read_schedule(season: str) -> list[dict]:
    """Upcoming + played games of a season. The dataset only publishes the current season's file."""
    start = int(season[:4]) % 100
    name = f"LeagueSchedule{start:02d}_{(start + 1) % 100:02d}.csv"
    try:
        with download(name) as path, open(path, newline="", encoding="utf-8") as fh:
            raw = list(csv.DictReader(fh))
    except Exception as e:
        print(f"  no schedule file {name} ({e.__class__.__name__}), skipping")
        return []
    # older seasons' files use other column names, their played games come from the box scores anyway
    if raw and not {"gameId", "homeTeamId", "awayTeamId", "gameDateTimeEst"} <= raw[0].keys():
        print(f"  schedule file {name} has an unknown format ({', '.join(list(raw[0].keys())[:8])}...), skipping")
        return []
    games = []
    for r in raw:
        game_id = normalize_game_id(r["gameId"])
        home, away = to_int(r["homeTeamId"]), to_int(r["awayTeamId"])
        if not wanted(game_id, {season}) or home not in TEAMS or away not in TEAMS:
            continue
        games.append({
            "id": game_id,
            "game_date": date.fromisoformat(r["gameDateTimeEst"][:10]),
            "start_time": start_time(r["gameDateTimeEst"]),
            "season": season,
            "home_team_id": home,
            "away_team_id": away,
        })
    print(f"  {len(games)} scheduled games in {season}")
    return games


# ---------- DB ----------

def upsert_teams(cur: psycopg.Cursor) -> None:
    cur.executemany(
        """
        INSERT INTO nba_team (id, abbreviation, name)
        VALUES (%s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET abbreviation = EXCLUDED.abbreviation, name = EXCLUDED.name
        """,
        [(tid, abbr, name) for tid, (abbr, name) in TEAMS.items()],
    )


def upsert_games(cur: psycopg.Cursor, games: list[dict]) -> None:
    # DO UPDATE so postponed/rescheduled games get their new date
    cur.executemany(
        """
        INSERT INTO nba_game (
            id, game_date, start_time, season, home_team_id, away_team_id, home_score, away_score, overtime_periods
        ) VALUES (
            %(id)s, %(game_date)s, %(start_time)s, %(season)s, %(home_team_id)s, %(away_team_id)s,
            %(home_score)s, %(away_score)s, %(overtime_periods)s
        )
        ON CONFLICT (id) DO UPDATE SET
            game_date = EXCLUDED.game_date,
            start_time = COALESCE(EXCLUDED.start_time, nba_game.start_time),
            home_team_id = EXCLUDED.home_team_id,
            away_team_id = EXCLUDED.away_team_id,
            -- schedule rows have no score, don't wipe one that box scores already set
            home_score = COALESCE(EXCLUDED.home_score, nba_game.home_score),
            away_score = COALESCE(EXCLUDED.away_score, nba_game.away_score),
            overtime_periods = COALESCE(EXCLUDED.overtime_periods, nba_game.overtime_periods)
        """,
        [{"home_score": None, "away_score": None, "overtime_periods": None, **g} for g in games],
    )


def upsert_box_scores(cur: psycopg.Cursor, rows: list[dict]) -> None:
    games = {
        r["game_id"]: {
            "id": r["game_id"],
            "game_date": r["game_date"],
            "start_time": r["start_time"],
            "season": r["season"],
            "home_team_id": r["home_team_id"],
            "away_team_id": r["away_team_id"],
            "home_score": 0,
            "away_score": 0,
        }
        for r in rows
    }
    # final score = sum of the team's player points (DNP rows are skipped but they have 0 points anyway)
    team_minutes: dict[tuple[str, int], float] = {}
    for r in rows:
        games[r["game_id"]]["home_score" if r["is_home"] else "away_score"] += r["pts"]
        key = (r["game_id"], r["team_id"])
        team_minutes[key] = team_minutes.get(key, 0) + r["minutes"]
    # overtime periods from minutes: regulation = 48 x 5 players = 240 team minutes, each OT adds 5 x 5 = 25
    for (game_id, _), minutes in team_minutes.items():
        periods = max(0, round((minutes - 240) / 25))
        games[game_id]["overtime_periods"] = max(games[game_id].get("overtime_periods") or 0, periods)
    upsert_games(cur, list(games.values()))

    # rows are sorted by date, so the last one wins = player's latest team
    # only current and previous season games set a team: a backfill of old seasons must not move
    # today's players back to their old teams, and long retired players are left without a team
    recent = previous_season(current_season())
    players = {
        r["player_id"]: (r["player_id"], r["player_name"], r["team_id"] if r["season"] >= recent else None)
        for r in rows
    }
    cur.executemany(
        """
        INSERT INTO nba_player (id, name, team_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, team_id = COALESCE(EXCLUDED.team_id, nba_player.team_id)
        """,
        list(players.values()),
    )

    cur.executemany(
        """
        INSERT INTO nba_player_game (
            player_id, game_id, team_id, opponent_id, is_home, minutes,
            pts, reb, ast, stl, blk, tov, fgm, fga, fg3m, fg3a, ftm, fta
        ) VALUES (
            %(player_id)s, %(game_id)s, %(team_id)s, %(opponent_id)s, %(is_home)s, %(minutes)s,
            %(pts)s, %(reb)s, %(ast)s, %(stl)s, %(blk)s, %(tov)s,
            %(fgm)s, %(fga)s, %(fg3m)s, %(fg3a)s, %(ftm)s, %(fta)s
        )
        ON CONFLICT (player_id, game_id) DO UPDATE SET
            minutes = EXCLUDED.minutes,
            pts = EXCLUDED.pts, reb = EXCLUDED.reb, ast = EXCLUDED.ast,
            stl = EXCLUDED.stl, blk = EXCLUDED.blk, tov = EXCLUDED.tov,
            fgm = EXCLUDED.fgm, fga = EXCLUDED.fga, fg3m = EXCLUDED.fg3m,
            fg3a = EXCLUDED.fg3a, ftm = EXCLUDED.ftm, fta = EXCLUDED.fta
        """,
        rows,
    )
    print(f"  saved {len(games)} games, {len(players)} players, {len(rows)} box scores")


def upsert_season_totals(cur: psycopg.Cursor, totals: list[dict]) -> None:
    # every season is rewritten on each sync: cheap (~35k rows) and picks up dataset corrections
    cur.executemany(
        """
        INSERT INTO nba_player_season (
            player_id, season, season_type, teams, games, minutes_games, minutes,
            pts, reb, ast, stl, blk, tov, fgm, fga, fg3m, fg3a, ftm, fta
        ) VALUES (
            %(player_id)s, %(season)s, %(season_type)s, %(teams)s, %(games)s, %(minutes_games)s, %(minutes)s,
            %(pts)s, %(reb)s, %(ast)s, %(stl)s, %(blk)s, %(tov)s,
            %(fgm)s, %(fga)s, %(fg3m)s, %(fg3a)s, %(ftm)s, %(fta)s
        )
        ON CONFLICT (player_id, season_type, season) DO UPDATE SET
            teams = EXCLUDED.teams, games = EXCLUDED.games,
            minutes_games = EXCLUDED.minutes_games, minutes = EXCLUDED.minutes,
            pts = EXCLUDED.pts, reb = EXCLUDED.reb, ast = EXCLUDED.ast,
            stl = EXCLUDED.stl, blk = EXCLUDED.blk, tov = EXCLUDED.tov,
            fgm = EXCLUDED.fgm, fga = EXCLUDED.fga, fg3m = EXCLUDED.fg3m,
            fg3a = EXCLUDED.fg3a, ftm = EXCLUDED.ftm, fta = EXCLUDED.fta
        """,
        totals,
    )
    print(f"  saved {len(totals)} player season totals")


def update_player_info(cur: psycopg.Cursor, players: list[dict]) -> None:
    # only players already in nba_player (synced seasons) get a bio, others are skipped by the WHERE
    cur.executemany(
        """
        UPDATE nba_player SET
            birth_date = %(birth_date)s, country = %(country)s, school = %(school)s,
            height_inches = %(height_inches)s, weight_lbs = %(weight_lbs)s,
            jersey = %(jersey)s, position = %(position)s,
            draft_year = %(draft_year)s, draft_round = %(draft_round)s, draft_number = %(draft_number)s,
            from_year = %(from_year)s
        WHERE id = %(id)s
        """,
        players,
    )
    print("  updated player bios")


def upsert_team_seasons(cur: psycopg.Cursor, team_seasons: list[dict]) -> None:
    cur.executemany(
        """
        INSERT INTO nba_team_season (team_id, season, abbreviation, name)
        VALUES (%(team_id)s, %(season)s, %(abbreviation)s, %(name)s)
        ON CONFLICT (team_id, season) DO UPDATE SET abbreviation = EXCLUDED.abbreviation, name = EXCLUDED.name
        """,
        team_seasons,
    )
    print(f"  saved {len(team_seasons)} team season names")


def upsert_team_stats(cur: psycopg.Cursor, rows: list[dict]) -> None:
    # only games that exist in nba_game (schedule + box scores), the foreign key would reject others
    cur.execute("SELECT id FROM nba_game")
    known = {r[0] for r in cur.fetchall()}
    rows = [r for r in rows if r["game_id"] in known]
    cols = ["game_id", "team_id", *TEAM_GAME_COLUMNS.values()]
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in TEAM_GAME_COLUMNS.values())
    cur.executemany(
        f"""
        INSERT INTO nba_team_game ({", ".join(cols)})
        VALUES ({", ".join(f"%({c})s" for c in cols)})
        ON CONFLICT (game_id, team_id) DO UPDATE SET {updates}
        """,
        rows,
    )
    print(f"  saved {len(rows)} team game lines")


def sync(seasons: list[str], chunk_size: int = 0) -> None:
    """Sync the given seasons. With chunk_size, seasons are read and saved a few at a time (oldest first)
    so a long backfill doesn't hold every box score in memory, the files are still downloaded only once."""
    seasons = sorted(set(seasons))
    chunks = [seasons[i:i + chunk_size] for i in range(0, len(seasons), chunk_size)] if chunk_size else [seasons]
    players = read_players()

    with download("PlayerStatistics.csv") as box_path, download("TeamStatistics.csv") as team_path:
        for i, chunk in enumerate(chunks):
            if len(chunks) > 1:
                print(f"Seasons {chunk[0]} - {chunk[-1]} ({i + 1}/{len(chunks)})")
            season_set = set(chunk)
            box_scores, season_totals = read_box_scores(box_path, season_set)
            team_stats, team_seasons = read_team_stats(team_path, season_set)
            schedule = [g for s in chunk for g in read_schedule(s)]

            with psycopg.connect() as conn:  # connection params from PG* env vars
                with conn.cursor() as cur:
                    upsert_teams(cur)
                    upsert_games(cur, schedule)
                    upsert_box_scores(cur, box_scores)
                    # totals cover every season in the dataset, saving them once is enough
                    if i == 0:
                        upsert_season_totals(cur, season_totals)
                    update_player_info(cur, players)
                    upsert_team_seasons(cur, team_seasons)
                    upsert_team_stats(cur, team_stats)
                conn.commit()
            del box_scores, season_totals, team_stats


def main() -> None:
    cur_season = current_season()
    parser = argparse.ArgumentParser(description="Sync NBA player box scores into Postgres")
    parser.add_argument(
        "--seasons",
        nargs="+",
        default=[previous_season(cur_season), cur_season],
        help="e.g. 2025-26 2026-27 (default: previous + current season)",
    )
    parser.add_argument(
        "--since",
        help="sync every season from this one to the current, 5 at a time, e.g. 1996-97 (overrides --seasons)",
    )
    args = parser.parse_args()
    if args.since:
        seasons = [season_string(y) for y in range(int(args.since[:4]), int(cur_season[:4]) + 1)]
        print(f"Syncing seasons {seasons[0]} - {seasons[-1]}")
        sync(seasons, chunk_size=5)
    else:
        print(f"Syncing seasons: {', '.join(args.seasons)}")
        sync(args.seasons)
    print("Done.")


if __name__ == "__main__":
    main()
