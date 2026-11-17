import { LogIn, LogOut, UserPlus } from "lucide-react";
import { authClient } from "../../utils/auth";
import { useState, type FormEvent } from "react";
import Loading from "../../components/Loading";

function AuthPage() {
    const { data: session, isPending } = authClient.useSession();
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        const { error } =
            mode === "signup"
                ? await authClient.signUp.email({ name, email, password })
                : await authClient.signIn.email({ email, password });
        if (error) setError(error.message ?? "Something went wrong");
    };

    if (isPending) return <Loading />;

    if (session) {
        return (
            <div className="mx-auto mt-16 max-w-sm space-y-4 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                <h1 className="text-2xl font-semibold">Hi, {session.user.name}</h1>
                <button
                    onClick={() => authClient.signOut()}
                    className="flex items-center gap-2 rounded-md bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-white cursor-pointer"
                >
                    <LogOut size={16} /> Sign out
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="mx-auto mt-16 max-w-sm space-y-3 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
            <h1 className="text-2xl font-semibold">
                {mode === "signup" ? "Create account" : "Sign in"}
            </h1>
            {mode === "signup" && (
                <input className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500" placeholder="Name"
                    value={name} onChange={(e) => setName(e.target.value)} required />
            )}
            <input className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500" type="email" placeholder="Email"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500" type="password" placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-500 hover:bg-sky-400 px-4 py-2 font-medium text-white cursor-pointer">
                {mode === "signup" ? <><UserPlus size={16} /> Sign up</> : <><LogIn size={16} /> Sign in</>}
            </button>
            <button type="button" className="w-full text-sm text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
                {mode === "signup" ? "Have an account? Sign in" : "No account? Sign up"}
            </button>
        </form>
    );
}

export default AuthPage;