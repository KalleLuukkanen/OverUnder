import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";

// shown in place of content that needs an account, sign up / sign in come back to this page afterwards
function SignInPrompt({ title, text }: { title: string, text: string }) {

    const location = useLocation();
    // the auth page sends the user back here once they're signed in
    const from = location.pathname + location.search;

    return (
        <div className="flex flex-col items-center gap-3 px-4 py-8 text-center bg-zinc-950/50 border border-dashed border-zinc-700 rounded-xl">
            <Lock size={22} className="text-sky-400" />
            <div className="flex flex-col gap-1">
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-zinc-400">{text}</p>
            </div>
            <div className="flex gap-2">
                <Link
                    className="px-4 py-2 rounded-md font-medium bg-sky-500 hover:bg-sky-400 text-on-accent"
                    to="/auth?mode=signup"
                    state={{ from }}
                >
                    Sign up free
                </Link>
                <Link
                    className="px-4 py-2 rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    to="/auth"
                    state={{ from }}
                >
                    Sign in
                </Link>
            </div>
        </div>
    )
}

export default SignInPrompt;
