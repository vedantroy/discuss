import { ActionFunction, LoaderFunction } from "~/mod";
import { authenticator } from "~/server/auth.server";

export let action: ActionFunction = async ({ request }) => {
    await authenticator.logout(request, { redirectTo: "/login" });
};

export let loader: LoaderFunction = async ({ request }) => {
    await authenticator.logout(request, { redirectTo: "/login" });
};
