// Auth is a little complicated & spans multiple files
// The overview is in auth.server.ts
import { Form, LoaderFunction, redirect } from "remix";
import { json, useLoaderData } from "remix";
import { SocialsProvider } from "remix-auth-socials";
import invariant from "tiny-invariant";
import { getSession, setSessionHeader } from "~/route-utils/session";
import { authenticator, SESSION_REDIRECT_KEY, sessionStorage } from "~/server/auth.server";

type LoaderData = {
    error: { message: string } | null;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const session = await getSession(request);

    const url = new URL(request.url);
    const redirectTo = url.searchParams.get("redirectTo");

    // 1. Check if the user is logged in
    const userData = await authenticator.isAuthenticated(request);
    if (userData?.meta.userExists) {
        // 2. Redirect the user to the page they were trying to access
        const redirectRoute = await session.get(SESSION_REDIRECT_KEY) || redirectTo;
        if (redirectRoute) {
            invariant(typeof redirectRoute === "string", `invalid redirect: ${redirectRoute}`);
            // A redirect was set using `session.flash`, so follow it
            // We need to commit the new session (which no longer has the flashed value,
            // since flashes are removed automatically on session.get)
            return redirect(redirectRoute, {
                headers: await setSessionHeader(session),
            });
        } else {
            // No redirect was set, so redirect to base page
            return redirect(`/`);
        }
    }

    if (redirectTo) {
        session.flash(SESSION_REDIRECT_KEY, redirectTo);
    }
    invariant(!userData?.meta.userExists, `user is authenticated`);
    // Show the user the login screen (with an error, if there was one)
    const error = session.get(
        authenticator.sessionErrorKey,
    ) as LoaderData["error"];
    return json<LoaderData>({ error }, { headers: await setSessionHeader(session) });
};

interface SocialButtonProps {
    provider: SocialsProvider;
    label: string;
}

const SocialButton: React.FC<SocialButtonProps> = ({ provider, label }) => (
    <Form action={`/auth/${provider}`} method="post">
        <button>{label}</button>
    </Form>
);

export default function Screen() {
    const { error } = useLoaderData<LoaderData>();

    return (
        <>
            {error && <div>{error.message}</div>}
            <SocialButton label="Google" provider={SocialsProvider.GOOGLE} />
        </>
    );
}
