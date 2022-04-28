import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "remix";
// import type { MetaFunction } from "remix";
import type { MetaFunction } from "@remix-run/cloudflare";
import styles from "./styles/app.css";

export const meta: MetaFunction = () => {
    return { title: "New Remix App" };
};

export function links() {
    return [{ rel: "stylesheet", href: styles }];
}

export default function App() {
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
                <Scripts />
                <LiveReload />
            </body>
        </html>
    );
}
