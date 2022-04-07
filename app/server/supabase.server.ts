import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            SUPABASE_URL: string;
            SUPABASE_SERVICE_KEY: string;
            SUPABASE_PUBLIC_ANON_KEY: string;
        }
    }
}

if (!process.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL is required");
}

// if (!process.env.SUPABASE_SERVICE_KEY) {
//     throw new Error("SUPABASE_SERVICE_KEY is required");
// }

if (!process.env.SUPABASE_PUBLIC_ANON_KEY) {
    throw new Error("SUPABASE_PUBLIC_ANON_KEY is required");
}

// Supabase options example (build your own :))
// https://supabase.com/docs/reference/javascript/initializing#with-additional-parameters

// const supabaseOptions = {
//   fetch, // see ⚠️ cloudflare
//   schema: "public",
//   persistSession: true,
//   autoRefreshToken: true,
//   detectSessionInUrl: true,
//   headers: { "x-application-name": "{my-site-name}" }
// };

export const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    // This is the server, so we could use the service key,
    // all API requests will be made through the server
    // and we don't want to bypass Postgres row level security
    process.env.SUPABASE_PUBLIC_ANON_KEY,
    {
        schema: "public",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
);

export { Session };
