import { createClient } from "@supabase/supabase-js";
import type { ClientEnv } from "~/shared/types";

declare global {
    interface Window {
        env: ClientEnv;
    }
}

if (!window.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL is required");
}

if (!window.env.SUPABASE_PUBLIC_ANON_KEY) {
    throw new Error("PUBLIC_SUPABASE_ANON_KEY is required");
}

export const supabaseClient = createClient(
    window.env.SUPABASE_URL,
    window.env.SUPABASE_PUBLIC_ANON_KEY,
    // TODO: Why do we set these options to `false`?
    { autoRefreshToken: false, persistSession: false },
);

export const signInWithGoogle = (redirectTo: string) =>
    supabaseClient.auth.signIn({
        provider: "google",
    }, { redirectTo });
