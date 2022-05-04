import { redirect } from "@remix-run/node";
import { authenticator, UserSession } from "~/server/auth.server";
import { getUserEmail } from "~/server/db/queries/auth";
import { ADMIN_USERS } from "~/server/env";
import { isLoggedIn } from "./session";

export function throwNotFoundResponse(msg: string = "Not Found"): never {
    throw new Response(msg, {
        status: 404,
    });
}

export function redirectToLogin(after: string): Response {
    return redirect(`/login?redirectTo=${encodeURIComponent(after)}`);
}

export async function assertLoggedIn(
    request: Request,
): Promise<Required<UserSession>["user"]> {
    const userData = await authenticator.isAuthenticated(request);
    const user = isLoggedIn(userData);
    if (!user) {
        throw new Response("Unauthorized", { status: 401 });
    }
    return user;
}

export async function assertAdmin(request: Request) {
    const userData = await authenticator.isAuthenticated(request);
    const user = isLoggedIn(userData);
    if (!user) {
        throw new Response("Unauthorized", { status: 401 });
    }

    const email = await getUserEmail(user.shortId);
    const isAdmin = Boolean(email && ADMIN_USERS.includes(email));
    if (!isAdmin) {
        throw new Response("Unauthorized", { status: 401 });
    }
}
