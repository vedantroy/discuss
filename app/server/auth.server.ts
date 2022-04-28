import { createCookieSessionStorage } from "~/mod";
import { Authenticator } from "remix-auth";
import { OAuth2StrategyVerifyParams } from "remix-auth-oauth2";
import { GoogleExtraParams, GoogleProfile, GoogleStrategy, SocialsProvider } from "remix-auth-socials";
import { getUserFromGoogleIdentity } from "./queries/auth";
import { ShortUserID } from "./queries/common";

export const sessionStorage = createCookieSessionStorage({
    cookie: {
        name: "auth",
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secrets: ["s3cr3t"], // This should be an env variable
        secure: process.env.NODE_ENV === "production",
    },
});

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            GOOGLE_CLIENT_ID: string;
            GOOGLE_CLIENT_SECRET: string;
        }
    }
}

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
        [SocialsProvider.GOOGLE]?: OAuth2StrategyVerifyParams<GoogleProfile, GoogleExtraParams>;
    };
    user?: {
        shortId: ShortUserID;
    };
};

export const authenticator = new Authenticator<UserSession>(sessionStorage);
authenticator.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `http://localhost:3000/auth/${SocialsProvider.GOOGLE}/callback`,
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
