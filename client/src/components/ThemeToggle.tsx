import { useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

// index.html sets data-theme from localStorage before the page renders, so start from that
const currentTheme = (): Theme =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark";

// switches between dark and light mode and remembers the choice
function ThemeToggle({ className = "" }: { className?: string }) {

    const [theme, setTheme] = useState<Theme>(currentTheme);

    const toggle = () => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
            localStorage.setItem("theme", next);
        } catch {
            // storage blocked (private mode etc.), the theme just isn't remembered
        }
        setTheme(next);
    };

    const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

    return (
        <button
            className={`p-2 rounded-md cursor-pointer text-zinc-300 hover:bg-zinc-800 hover:text-white ${className}`}
            type="button"
            aria-label={label}
            title={label}
            onClick={toggle}
        >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}

export default ThemeToggle;
