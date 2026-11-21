import { ArrowLeft, LogIn, LogOut, UserPlus, Trash2 } from "lucide-react";
import { authClient } from "../../utils/auth";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Loading from "../../components/Loading";
import { useLeague } from "../../context/LeagueContext";
import { SPORTS } from "../../types/leagues";

const input = "w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500";

// arrow back to the home page, top left of the auth page
function HomeLink() {
    return (
        <Link className="flex items-center gap-2 w-fit px-2 py-1.5 -ml-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white" to="/">
            <ArrowLeft size={18} /> Back to home
        </Link>
    )
}

// the league the home page opens, saved in this browser
// every league is listed, the ones that aren't ready yet can't be picked
function DefaultLeague() {

    const { defaultLeague, setDefaultLeague } = useLeague();
    const [saved, setSaved] = useState(false);

    return (
        <label className="flex flex-col gap-1.5 pt-4 border-t border-zinc-800">
            <span className="text-sm font-medium text-zinc-300">Default league</span>
            <select
                className={`${input} [color-scheme:dark] cursor-pointer`}
                value={defaultLeague}
                onChange={(e) => { setDefaultLeague(e.target.value); setSaved(true); }}
            >
                {SPORTS.map((s) => (
                    <optgroup key={s.sport} label={`${s.emoji} ${s.sport}`}>
                        {s.leagues.map((l) => (
                            <option key={l.slug} value={l.slug} disabled={!l.available}>
                                {l.name}{l.available ? "" : " (soon)"}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </select>
            <span className="text-xs text-zinc-500">
                {saved ? "Saved. " : ""}The home page opens this league. You can still switch leagues from the top right.
            </span>
        </label>
    )
}

// '19.11.2026'
const formatDate = (date: Date | string) => new Date(date).toLocaleDateString("fi-FI");

function AuthPage() {
    const { data: session, isPending } = authClient.useSession();
    const navigate = useNavigate();
    // links to this page pass the page they were on (state.from), a sign up link opens the sign up form (?mode=signup)
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const from = (location.state as { from?: string } | null)?.from;
    const [mode, setMode] = useState<"signin" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "signin");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        const { error } =
            mode === "signup"
                ? await authClient.signUp.email({ name, email, password })
                : await authClient.signIn.email({ email, password });
        setSubmitting(false);
        if (error) {
            setError(error.message ?? "Something went wrong");
            return;
        }
        // back to the page the user came from, home if they opened /auth directly
        // replace, so going back doesn't land on the form again
        // (shown inside a protected page instead of /auth: that page just renders once signed in)
        if (from) {
            navigate(from, { replace: true });
        } else if (location.pathname === "/auth") {
            navigate("/", { replace: true });
        }
    };

    const deleteAccount = async () => {
        if (!confirm("Delete your account? This can't be undone.")) return;
        const { error } = await authClient.deleteUser();
        if (error) {
            alert(error.message ?? "Couldn't delete the account, please try again");
            return;
        }
        navigate("/", { replace: true });
    };

    if (isPending) return <Loading />;

    if (session) {
        const user = session.user;
        return (
            <div className="flex flex-col gap-6">
                <HomeLink />
                <div className="mx-auto w-full max-w-sm flex flex-col gap-5 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-4">
                        {/* first letter of the name as an avatar */}
                        <span className="flex items-center justify-center w-12 h-12 shrink-0 rounded-full bg-sky-500 text-on-accent text-xl font-semibold" aria-hidden="true">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-2xl font-semibold truncate">{user.name}</h1>
                            <span className="text-sm text-zinc-400 truncate">{user.email}</span>
                        </div>
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt className="text-zinc-400">Member since</dt>
                        <dd className="text-zinc-100">{formatDate(user.createdAt)}</dd>
                        <dt className="text-zinc-400">Access</dt>
                        <dd className="text-zinc-100">All past seasons</dd>
                    </dl>
                    <DefaultLeague />
                    <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800">
                        <button
                            className="flex items-center justify-center gap-2 rounded-md bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-zinc-100 cursor-pointer"
                            type="button"
                            onClick={() => authClient.signOut()}
                        >
                            <LogOut size={16} /> Sign out
                        </button>
                        <button
                            className="flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
                            type="button"
                            onClick={deleteAccount}
                        >
                            <Trash2 size={14} /> Delete account
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <HomeLink />
            <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-3 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                <h1 className="text-2xl font-semibold">
                    {mode === "signup" ? "Create account" : "Sign in"}
                </h1>
                {mode === "signup" && (
                    <input className={input} placeholder="Name" autoComplete="name"
                        value={name} onChange={(e) => setName(e.target.value)} required />
                )}
                <input className={input} type="email" placeholder="Email" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input className={input} type="password" placeholder="Password" autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                {error && <p className="text-sm text-rose-400">{error}</p>}
                <button type="submit" disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-500 hover:bg-sky-400 px-4 py-2 font-medium text-on-accent cursor-pointer disabled:opacity-60 disabled:cursor-wait">
                    {mode === "signup" ? <><UserPlus size={16} /> Sign up</> : <><LogIn size={16} /> Sign in</>}
                </button>
                <button type="button" className="w-full text-sm text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                    onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
                    {mode === "signup" ? "Have an account? Sign in" : "No account? Sign up"}
                </button>
            </form>
        </div>
    );
}

export default AuthPage;
