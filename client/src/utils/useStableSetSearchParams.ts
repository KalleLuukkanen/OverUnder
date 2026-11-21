import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

// react router's setSearchParams, but the same function for the component's whole life
// (react router gives a new one on every url change, which re-ran effects depending on it:
// e.g. a prop checker restored the url's bet again after the user removed the player)
const useStableSetSearchParams = () => {
    const [, setSearchParams] = useSearchParams();
    const latest = useRef(setSearchParams);
    useEffect(() => {
        latest.current = setSearchParams;
    });
    return useCallback((...args: Parameters<typeof setSearchParams>) => latest.current(...args), []);
};

export default useStableSetSearchParams;
