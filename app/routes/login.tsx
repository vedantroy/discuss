import type { LoaderFunction } from "remix";
import { json, useLoaderData } from "remix";
import { signInWithGoogle } from "~/client/supabase.client";
import { authenticator, oAuthStrategy, sessionStorage } from "~/server/auth.server";

type LoaderData = {
    error: { message: string } | null;
};

export const loader: LoaderFunction = async ({ request }) => {
    await oAuthStrategy.checkSession(request, {
        successRedirect: "/pdf",
    });
    // If success, we won't get here

    const session = await sessionStorage.getSession(
        request.headers.get("Cookie"),
    );

    const error = session.get(
        authenticator.sessionErrorKey,
    ) as LoaderData["error"];

    return json<LoaderData>({ error });
};

export default function Screen() {
    const { error } = useLoaderData<LoaderData>();

    return (
        <>
            {error && <div>{error.message}</div>}

            <p>
                <button onClick={() => signInWithGoogle("http://localhost:3000/oauth/callback")}>
                    Sign in with Google
                </button>
            </p>
        </>
    );
}
