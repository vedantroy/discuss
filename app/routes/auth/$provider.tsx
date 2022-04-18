import { ActionFunction, LoaderFunction, redirect } from "remix";
import invariant from "tiny-invariant";
import { authenticator } from "~/server/auth.server";

export let loader: LoaderFunction = () => {
    return redirect("/login");
};

export let action: ActionFunction = ({ request, params }) => {
    invariant(params.provider, "provider is required");
    return authenticator.authenticate(params.provider, request);
};
