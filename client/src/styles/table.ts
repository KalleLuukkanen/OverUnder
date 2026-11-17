// shared class names for the dark stat tables (box score, career, latest games)
const table = {
    wrapper: "overflow-x-auto bg-zinc-900 border border-zinc-800 rounded-xl",
    table: "w-full text-right text-sm whitespace-nowrap",
    headRow: "border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-400",
    th: "px-3 py-2.5 font-medium",
    row: "border-b border-zinc-800/60 last:border-b-0 hover:bg-zinc-800/40",
    td: "px-3 py-2",
    footRow: "border-t border-zinc-700 bg-zinc-800/40 font-semibold text-zinc-200",
    link: "text-zinc-100 hover:text-sky-400 hover:underline",
    // header button of a sortable column, active column is highlighted
    sortButton: (active: boolean, alignLeft = false) =>
        `flex items-center gap-0.5 cursor-pointer uppercase hover:text-zinc-200 ${alignLeft ? "" : "ml-auto"} ${active ? "text-sky-400" : ""}`,
};

export default table;
