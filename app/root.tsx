// import css from "@phuocng/react-pdf-viewer/cjs/react-pdf-viewer.css";
import { Links, LiveReload, LoaderFunction, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "remix";
import type { MetaFunction } from "remix";
import { ClientEnv } from "./shared/types";
import styles from "./styles/app.css";

type Root = {
    env: ClientEnv;
};

export const loader: LoaderFunction = () => {
    return {
        // https://remix.run/docs/en/v1/guides/envvars#browser-environment-variables
        env: {
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_PUBLIC_ANON_KEY: process.env.SUPABASE_PUBLIC_ANON_KEY,
        },
    } as Root;
};

export const meta: MetaFunction = () => {
    return { title: "New Remix App" };
};

export function links() {
    return [{ rel: "stylesheet", href: styles }];
}

export default function App() {
    const { env } = useLoaderData<Root>();

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1" />
                <Meta />
                <Links />
            </head>
            <body>
                <Outlet />
                <ScrollRestoration />
                <script
                    // Must go before the <Scripts /> tag -- since the scripts use these injected env variables
                    dangerouslySetInnerHTML={{ __html: `window.env = ${JSON.stringify(env)}` }}
                />
                <Scripts />
                <LiveReload />
            </body>
        </html>
    );
}
