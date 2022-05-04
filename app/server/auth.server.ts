import { Authenticator } from "remix-auth";
import { OAuth2StrategyVerifyParams } from "remix-auth-oauth2";
import {
    GoogleExtraParams,
    GoogleProfile,
    GoogleStrategy,
    SocialsProvider,
} from "remix-auth-socials";
import { createCookieSessionStorage } from "~/mod";
import { ShortUserID } from "~/server/model/types";
import getenv from "~/vendor/getenv.ts";
import { getUserFromGoogleIdentity } from "./db/queries/auth";
import { IS_PRODUCTION, IS_TEST } from "./env";

const COOKIE_SECRET = getenv.string("COOKIE_SECRET");

export const sessionStorage = createCookieSessionStorage({
    cookie: {
        name: "auth",
        // when testing, we want to be able to read/write the cookie in the browser
        httpOnly: !IS_TEST,
        path: "/",
        sameSite: "lax",
        secrets: [COOKIE_SECRET], // This should be an env variable
        secure: process.env.NODE_ENV === "production",
    },
});

const GOOGLE_CLIENT_ID = getenv.string("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = getenv.string("GOOGLE_CLIENT_SECRET");

export const SESSION_REDIRECT_KEY = "auth:redirect";

// Auth state flows:

// Protected route requiring login
// 1. User hits protected route (& is not logged in)
// 2. We set SESSION_REDIRECT_KEY to the route to redirect to
// 3. Users logs in using OAuth
// 4. In verify we log in the user & return the data
// 5. The callback
// 6.
// 3. User logs in using OAuth
// 4. In verify, we log in the user & return the user data
// 5. We return to /login
// 6. We read the GenericRedirect cookie in login & redirect to the correct link while destroying the cookie

// Basically: login acts like an router
// Signup
// Protected route requiring signup
// 1. User hits protected route (& is not logged in)
// 2. We set session error to GenericRedirect
// 3. We reach sign up / login page - user clicks sign up
// 4. User signs up & we receive a OAuth callback
// 5. In verify, we get the Google user data & create a new user (returning it)
// 4. We get back their data & see we need to do signup
// 5. We redirect to signup
// 6. Signup finishes & redirects to login
// 7. Login reads GenericRedirect cookie & redirects to the correct link while destroying the cookie

export type UserSession = {
    meta: {
        userExists?: boolean;
        [SocialsProvider.GOOGLE]?: OAuth2StrategyVerifyParams<
            GoogleProfile,
            GoogleExtraParams
        >;
    };
    user?: {
        shortId: ShortUserID;
    };
};

const GoogleDevURL = `http://localhost:3000/auth/${SocialsProvider.GOOGLE}/callback`;
const GoogleTestURL = `http://localhost:3005/auth/${SocialsProvider.GOOGLE}/callback`;
const GoogleProdURL = `https://chimu.sh/auth/${SocialsProvider.GOOGLE}/callback`;

export const authenticator = new Authenticator<UserSession>(sessionStorage);
authenticator.use(
    new GoogleStrategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: IS_PRODUCTION ? GoogleProdURL : IS_TEST ? GoogleTestURL : GoogleDevURL,
    }, async (oauth) => {
        const user = await getUserFromGoogleIdentity(oauth.profile._json.sub);
        if (!user) {
            return { meta: { userExists: false, [SocialsProvider.GOOGLE]: oauth } };
        }
        return {
            user,
            meta: { userExists: true },
        };
    }),
);
