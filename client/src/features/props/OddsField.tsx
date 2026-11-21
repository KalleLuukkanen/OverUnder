import { parseOdds } from "../../utils/odds";

// optional decimal odds field of a prop checker form ('1,85' works too), red border when not valid odds
// control and label are the checker's own form classes
function OddsField({ value, onChange, control, label }: { value: string, onChange: (value: string) => void, control: string, label: string }) {

    const invalid = value.trim() !== "" && parseOdds(value) === null;

    return (
        <label className="flex flex-col gap-1">
            <span className={label}>Odds <span className="normal-case tracking-normal text-zinc-500">(optional)</span></span>
            <input
                className={`${control} ${invalid ? "border-rose-500 focus:border-rose-500" : ""}`}
                type="text"
                inputMode="decimal"
                placeholder="e.g. 1.85"
                aria-invalid={invalid}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    )
}

export default OddsField;
