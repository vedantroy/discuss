import { ActionFunction, LoaderFunction, redirect } from "remix";
import { authenticator } from "~/server/auth.server";
import { getParam } from "~/route-utils/params";

export let loader: LoaderFunction = async ({ request, params }) => {
   const provider = getParam(params, "provider");
   const userData = await authenticator.authenticate(provider, request)
   if (!userData.meta.userExists) {
       return redirect(`/auth/${provider}/callback`)
   }
   return redirect("/login");
};

export let action: ActionFunction = async ({ request, params }) => {
    return authenticator.authenticate(getParam(params, "provider"), request);
};