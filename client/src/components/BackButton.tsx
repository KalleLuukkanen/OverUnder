import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// arrow back to the previous page (home, /nba, ...)
// if the page was opened directly (no in-app history), goes to fallback instead of leaving the site
function BackButton({ fallback = "/nba" }: { fallback?: string }) {

    const navigate = useNavigate();
    const location = useLocation();

    const goBack = () => {
        if (location.key === "default") {
            navigate(fallback);
        } else {
            navigate(-1);
        }
    };

    return (
        <button
            className="p-1.5 rounded-md self-start cursor-pointer text-zinc-400 hover:bg-zinc-800 hover:text-white"
            type="button"
            aria-label="Go back"
            onClick={goBack}
        >
            <ArrowLeft size={22} />
        </button>
    )
}

export default BackButton;
