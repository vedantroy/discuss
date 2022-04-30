import { useLoaderData } from "@remix-run/react";
import { json, LoaderFunction } from "~/mod";
import { isLoggedIn } from "~/route-utils/session";
import { authenticator } from "~/server/auth.server";
// import { getClubsForUser, UserClubs } from "~/server/queries";

type LoaderData =
    | { loggedIn: true; clubs: any }
    | { loggedIn: false };

export const loader: LoaderFunction = async ({ request, params }) => {
    const userData = await authenticator.isAuthenticated(request);
    const user = isLoggedIn(userData);
    if (!user) {
        return json({ loggedIn: false });
    }
    return json({ loggedIn: true });
    // return json({ loggedIn: true, clubs: await getClubsForUser(user.shortId) });
};

export default function() {
    const data = useLoaderData();
    return data.loggedIn ? <div>loggedIn 1</div> : <div>not logged in 2</div>;
}

// TODO: We need a landing page
// Core thesis:
// -
