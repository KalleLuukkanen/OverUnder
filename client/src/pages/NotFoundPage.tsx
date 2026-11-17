import { Link } from "react-router-dom";

export default function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
            <h1 className="text-6xl font-bold text-zinc-700">404</h1>
            <p className="text-zinc-400">This page doesn't exist.</p>
            <Link to="/" className="text-sky-400 hover:underline">
                Back to home
            </Link>
        </div>
    );
}
