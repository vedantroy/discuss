import { ActionFunction, LoaderFunction, redirect } from "~/mod";
import { getParam } from "~/route-utils/params";
import { authenticator } from "~/server/auth.server";

export let loader: LoaderFunction = async ({ request, params }) => {
    const provider = getParam(params, "provider");
    const userData = await authenticator.authenticate(provider, request);
    if (!userData.meta.userExists) {
        // The callback also acts as the signup page
        // This case happens when the user is already logged into (e.g.) Google,
        // but does not have an account on the site.
        return redirect(`/auth/${provider}/callback`);
    }
    return redirect("/login");
};

export let action: ActionFunction = async ({ request, params }) => {
    // This will throw a redirect to a URL that looks like
    // https://accounts.google.com/o/oauth2/v2/auth?scope=openid+profile+email&access_type=online&include_granted_scopes=false&response_type=code&client_id=265029962644-kv8f3530jq83lk8n5kvig0m1hjalg39b.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback&state=510acf23-3b15-4dbf-b592-7f530dc6f45f
    // *I believe* that URL will then redirect to the callback URL
    await authenticator.authenticate(getParam(params, "provider"), request);
};
