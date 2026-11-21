import { Request, Response, NextFunction } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

// Express 4 doesn't catch errors of async handlers: a failing query would be an unhandled rejection
// and crash the server. Wrapped handlers pass the error on to the error handler in app.ts instead
const wrap = (handler: Handler) =>
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };

export default wrap;
