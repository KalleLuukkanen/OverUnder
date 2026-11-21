import { get } from "./apiClient";
import type { Calibration } from "../types/nba";

// how accurate the estimated chances are: the backtest report and the real legs (own ones when signed in)
const getCalibration = () =>
    get<Calibration>("/api/calibration");

export {
    getCalibration,
};
