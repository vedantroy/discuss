import { useEffect } from "react";
import type { ActionFunction } from "remix";
import { useSubmit } from "remix";
import { supabaseClient } from "~/client/supabase.client";
import { authenticator } from "~/server/auth.server";

export const action: ActionFunction = async ({ request }) => {
    await authenticator.authenticate("sb-oauth", request, {
        successRedirect: "/private",
        failureRedirect: "/login",
    });
};

export default function OAuth() {
    const submit = useSubmit();

    useEffect(() => {
        const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN") {
                const formData = new FormData();
                formData.append("session", JSON.stringify(session));
                submit(formData, { method: "post" });
            }
        });

        return () => {
            authListener?.unsubscribe();
        };
    }, [submit]);

    return null;
}
