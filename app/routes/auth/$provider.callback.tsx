// TODO: Do we need to do CSRF protection here?

import { ActionFunction, json, LoaderFunction, redirect, useLoaderData } from "remix";
import invariant from "tiny-invariant";
import { authenticator, sessionStorage } from "~/server/auth.server";

export let action: ActionFunction = async ({ request, params }) => {
};

export let loader: LoaderFunction = async ({ request, params }) => {
    const { provider } = params;
    invariant(provider, "provider is required");
    const userData = await authenticator.authenticate(provider, request);

    // At this point, we knowthis is a valid OAuth callback
    // (the user is logged in)
    // MEDIOCRE EXPLANATION:
    // Why? Because the OAuth package we're using has a state parameter
    // (When we submit the OAuth request we pass in some state, which is also stored in our session,
    // when the callback finishes, we check if the state in the URL matches the state in our session)
    // https://stackoverflow.com/questions/26132066/what-is-the-purpose-of-the-state-parameter-in-oauth-authorization-request
    // An attacker cannot forge the state parameter since we modify the session on the server to store it
    // (More generally, the cookie which stores the session is signed with an HMAC, which requires knowing the secret. Only we know the secret)

    // BUT, we need to protect the POST API route. Otherwise, someone could submit
    // a POST from their computer & insert a fake user into the database
    // It's sufficient to just check if the user is signed in inside the POST request

    if (!userData.meta.userExists) {
        const session = await sessionStorage.getSession(
            request.headers.get("Cookie"),
        );
        // We need to manually update the session
        session.set(authenticator.sessionKey, userData);
        // Is there a way to just set headers?
        return json({}, { headers: { "Set-Cookie": await sessionStorage.commitSession(session) } });
    }
    return redirect("/login");
};

export default function() {
    return <div>Signup!</div>;
}
