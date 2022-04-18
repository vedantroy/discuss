import { ActionFunction, LoaderFunction } from "remix";
import invariant from "tiny-invariant";
import { authenticator } from "~/server/auth.server";

export let loader: LoaderFunction = ({ request, params }) => {
    invariant(params.provider, "provider is required");
    return authenticator.authenticate(params.provider, request, {
        // TODO: redirect to an actual page
        successRedirect: "/pdf/123",
        failureRedirect: "/login",
    });
};
