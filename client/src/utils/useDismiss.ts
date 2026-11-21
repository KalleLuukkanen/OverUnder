import { useEffect, type RefObject } from "react";

// closes an open menu on a click outside ref's element or on escape
const useDismiss = (open: boolean, close: () => void, ref: RefObject<HTMLElement | null>) => {
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) close();
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, close, ref]);
};

export default useDismiss;
