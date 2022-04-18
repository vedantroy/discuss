import { createCookieSessionStorage } from "remix";
import { Authenticator, AuthorizationError } from "remix-auth";
import { GoogleStrategy, SocialsProvider } from "remix-auth-socials";
import { getUserFromGoogleIdentity, UserSession } from "./queries.server";

export const sessionStorage = createCookieSessionStorage({
    cookie: {
        name: "sb",
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

export const authenticator = new Authenticator<UserSession>(sessionStorage);
authenticator.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `http://localhost:3000/auth/${SocialsProvider.GOOGLE}/callback`,
    }, async (oauth) => {
        const { profile: { displayName, _json } } = oauth;
        const { sub } = _json;
        const user = await getUserFromGoogleIdentity(sub);
        // @ts-ignore
        return user as any;
    }),
    "google",
);
