import { Session } from "@remix-run/node";
import invariant from "tiny-invariant";
import { sessionStorage, UserSession } from "~/server/auth.server";

export function getSession(req: Request): Promise<Session> {
    return sessionStorage.getSession(req.headers.get("cookie"));
}

export async function setSessionHeader(
    session: Session,
): Promise<{ "Set-Cookie": string }> {
    return {
        "Set-Cookie": await sessionStorage.commitSession(session),
    };
}

export function isLoggedIn(
    user: UserSession | null,
): Exclude<UserSession["user"], undefined> | null {
    const loggedIn = Boolean(user && user.meta.userExists);
    if (!loggedIn) return null;
    invariant(user?.user);
    return user.user;
}
