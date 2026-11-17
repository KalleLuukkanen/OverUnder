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
            className="cursor-pointer rounded hover:bg-gray-200 p-1 self-start"
            type="button"
            aria-label="Go back"
            onClick={goBack}
        >
            <ArrowLeft size={28} />
        </button>
    )
}

export default BackButton;
