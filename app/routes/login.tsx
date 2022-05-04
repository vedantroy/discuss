// Auth is a little complicated & spans multiple files
// The overview is in auth.server.ts
import { SocialsProvider } from "remix-auth-socials";
import invariant from "tiny-invariant";
import { Form, json, LoaderFunction, redirect, useLoaderData } from "~/mod";
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
            invariant(
                typeof redirectRoute === "string",
                `invalid redirect: ${redirectRoute}`,
            );
            // A redirect was set using `session.flash`, so follow it
            // We need to commit the new session (which no longer has the flashed value,
            // since flashes are removed automatically on session.get)
            return redirect(redirectRoute, {
                headers: await setSessionHeader(session),
            });
        } else {
            // No redirect was set, so redirect to base page
            return redirect(`/dash`);
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

// Taken from tailwind flowbyte??
const GoogleButton = ({ children }: { children: React.ReactNode }) => (
    <button
        type="submit"
        className="text-white bg-[#4285F4] hover:bg-[#4285F4]/90 focus:ring-4 focus:outline-none focus:ring-[#4285F4]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#4285F4]/55 mr-2 mb-2"
    >
        <svg
            className="w-4 h-4 mr-2 -ml-1"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="google"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
        >
            <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
            >
            </path>
        </svg>
        {children}
    </button>
);

export default function Screen() {
    const { error } = useLoaderData<LoaderData>();

    return (
        <div className="w-full h-screen flex flex-row items-center justify-center">
            {error && <div>{error.message}</div>}
            <Form
                className="mx-auto"
                action={`/auth/${SocialsProvider.GOOGLE}`}
                method="post"
            >
                <GoogleButton>Sign in with Google</GoogleButton>
            </Form>
        </div>
    );
}
