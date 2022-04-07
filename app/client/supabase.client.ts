import { createClient } from "@supabase/supabase-js";

declare global {
    interface Window {
        env: {
            SUPABASE_URL: string;
            PUBLIC_SUPABASE_ANON_KEY: string;
        };
    }
}

if (!window.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL is required");
}

if (!window.env.PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("PUBLIC_SUPABASE_ANON_KEY is required");
}

export const supabaseClient = createClient(
    window.env.SUPABASE_URL,
    window.env.PUBLIC_SUPABASE_ANON_KEY,
    // TODO: Why do we set these options to `false`?
    { autoRefreshToken: false, persistSession: false },
);

export const signInWithGoogle = (redirectTo = "http://localhost:3000/oauth/callback") =>
    supabaseClient.auth.signIn({
        provider: "google",
    }, { redirectTo });
