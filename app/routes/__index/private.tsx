// This is a test route

import { LoaderFunction, redirect } from "remix";
import { getSession, setSessionHeader } from "~/route-utils/session";
import { authenticator, SESSION_REDIRECT_KEY, sessionStorage } from "~/server/auth.server";

export const loader: LoaderFunction = async ({ request, params }) => {
    const userData = await authenticator.isAuthenticated(request);
    if (!userData || !userData?.meta.userExists) {
        const session = await getSession(request);
        session.flash(SESSION_REDIRECT_KEY, request.url);
        return redirect("/login", {
            headers: await setSessionHeader(session),
        });
    }
    return null;
};

export default function() {
    return <div>Only for logged in users!!</div>;
}
