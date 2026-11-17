import type { NbaPlayer } from "../../../types/nba";

const POSITIONS: Record<string, string> = {
    G: "Guard",
    F: "Forward",
    C: "Center",
};

// 'G-F' -> 'Guard-Forward'
const positionName = (position: string) =>
    position.split("-").map((p) => POSITIONS[p] ?? p).join("-");

// 81 inches -> 6'9" (206 cm)
const height = (inches: number) =>
    `${Math.floor(inches / 12)}'${inches % 12}" (${Math.round(inches * 2.54)} cm)`;

// 250 lbs -> 250 lbs (113 kg)
const weight = (lbs: number) => `${lbs} lbs (${Math.round(lbs * 0.4536)} kg)`;

// '1984-12-30' -> 30.12.1984 (age 41)
const birthday = (birth_date: string) => {
    const [y, m, d] = birth_date.split("-").map(Number);
    const today = new Date();
    const hadBirthday = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
    const age = today.getFullYear() - y - (hadBirthday ? 0 : 1);
    return `${d}.${m}.${y} (age ${age})`;
};

// '2003 Round 1, Pick 1', or 'Undrafted' when the draft year has no round
const draft = (player: NbaPlayer) => {
    if (player.draft_year === null) return null;
    if (player.draft_round === null) return "Undrafted";
    const pick = player.draft_number === null ? "" : `, Pick ${player.draft_number}`;
    return `${player.draft_year} Round ${player.draft_round}${pick}`;
};

// player's bio card, rows the dataset doesn't have are left out
function PlayerInfo({ player }: { player: NbaPlayer }) {

    const rows: [string, string | null][] = [
        ["Team", player.team_name],
        ["Jersey", player.jersey && `#${player.jersey}`],
        ["Position", player.position && positionName(player.position)],
        ["Height", player.height_inches === null ? null : height(player.height_inches)],
        ["Weight", player.weight_lbs === null ? null : weight(player.weight_lbs)],
        ["Born", player.birth_date && birthday(player.birth_date)],
        ["Country", player.country],
        ["School", player.school],
        ["Draft", draft(player)],
        ["First season", player.from_year === null ? null : `${player.from_year}-${String((player.from_year + 1) % 100).padStart(2, "0")}`],
    ];

    const shown = rows.filter(([, value]) => value);

    return (
        <div className="flex flex-col bg-gray-100 rounded shadow p-3 space-y-2 w-full xl:w-80 shrink-0 self-start">
            <span className="text-xl font-semibold">Player info</span>
            {shown.length === 0 ?
                <p className="text-gray-500">No player info available</p> :
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    {shown.map(([label, value]) => (
                        <div key={label} className="contents">
                            <dt className="text-gray-600">{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            }
        </div>
    )
}

export default PlayerInfo;
