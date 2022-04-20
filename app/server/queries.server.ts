import { User } from "dbschema/edgeql-js/modules/default";
import { nanoid } from "nanoid";
import type { Brand } from "ts-brand";
import db, { e, t } from "~/server/edgedb.server";

// Get the Google OAuth data if it exists
export async function getUserFromGoogleIdentity(sub: string): Promise<{ shortId: string } | null> {
    const query = e.select(e.GoogleIdentity, google => ({
        user: {
            shortId: true,
        },
        filter: e.op(google.sub, "=", sub),
    }));
    const r = await query.run(db);
    return r?.user || null;
}

export type ShortUserID = Brand<string, "ShortUserID">;
export type CreateUser = {
    displayName: string;
    email: string;
    image?: string;
};
export type CreateGoogleIdentity = {
    sub: string;
    email: string;
    displayName: string;
};

export async function insertUserWithGoogleIdentity(
    { user, google }: { user: CreateUser; google: CreateGoogleIdentity },
): Promise<ShortUserID> {
    const shortId = nanoid();
    const query = e.insert(e.GoogleIdentity, {
        displayName: google.displayName,
        sub: google.sub,
        email: google.email,
        user: e.insert(e.User, {
            displayName: user.displayName,
            email: user.email,
            shortId,
        }),
    });
    const r = await query.run(db);
    return shortId as ShortUserID;
}
