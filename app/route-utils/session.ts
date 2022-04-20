import type { Session } from "remix";
import { sessionStorage } from "~/server/auth.server";

export function getSession(req: Request): Promise<Session> {
    return sessionStorage.getSession(req.headers.get("cookie"));
}
