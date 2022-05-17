import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import {
    json,
    Links,
    LiveReload,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useLoaderData,
} from "~/mod";
import { isLoggedIn } from "./route-utils/session";
import { authenticator } from "./server/auth.server";
import { IS_PRODUCTION } from "./server/env";
import { ShortUserID } from "./server/model/types";
import styles from "./styles/app.css";

export const meta: MetaFunction = () => {
    return { title: "Chimu" };
};

export function links() {
    return [{ rel: "stylesheet", href: styles }];
}

type SharedEnv = {
    LogRocketAPIKey: string | undefined;
    PRODUCTION: boolean;
};
type SharedData = SharedEnv & { logRocketIdentifyCode: string };

export const loader: LoaderFunction = async ({ request }) => {
    const userData = await authenticator.isAuthenticated(request);
    const user = await isLoggedIn(userData);
    // the name & email values will be undefined for old sessions (since they won't be stored in the cookie)
    const logRocketIdentifyCode = user && IS_PRODUCTION
        ? `window.LogRocket.identify("${user.shortId}", { name: "${user.displayName}", email: "${user.email}" });window.__LogRocket_id = true`
        : "";

    console.log("ROOT LOADER");
    console.log(logRocketIdentifyCode);

    const env: SharedData = {
        LogRocketAPIKey: process.env.LOG_ROCKET_API_KEY,
        PRODUCTION: IS_PRODUCTION,
        logRocketIdentifyCode,
    };

    return json(env);
};

export default function App() {
    const { LogRocketAPIKey, logRocketIdentifyCode: code, PRODUCTION } = useLoaderData<
        SharedData
    >();

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1" />
                {PRODUCTION
                    ? (
                        <>
                            <script
                                src="https://cdn.lr-in-prod.com/LogRocket.min.js"
                                crossOrigin="anonymous"
                            >
                            </script>
                            <script
                                dangerouslySetInnerHTML={{
                                    __html:
                                        `window.LogRocket && window.LogRocket.init('${LogRocketAPIKey}');${code};`,
                                }}
                            >
                            </script>
                        </>
                    )
                    : null}
                <Meta />
                <Links />
            </head>
            <body>
                <Outlet />
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
            </body>
        </html>
    );
}
