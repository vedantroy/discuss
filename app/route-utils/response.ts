import { redirect } from "@remix-run/node";

export function throwNotFoundResponse(msg: string = "Not Found"): never {
    throw new Response(msg, {
        status: 404,
    });
}

export function redirectToLogin(after: string): Response {
    return redirect(`/login?redirectTo=${encodeURIComponent(after)}`);
}
