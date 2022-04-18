import db, { e, t } from "~/server/edgedb.server";

export type UserSession = {
    id: string;
};

// Get the Google OAuth data if it exists
export async function getUserFromGoogleIdentity(sub: string): Promise<UserSession | null> {
    const query = e.select(e.GoogleIdentity, google => ({
        user: true,
        filter: e.op(google.sub, "=", sub),
    }));
    const r = await query.run(db);
    return r ? { id: r.user.id } : null;
}
