import { nanoid } from "nanoid";
import db, { e } from "~/server/edgedb.server";
import { ShortUserID } from "./common";

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
            image: user.image || "",
            createdAt: e.datetime_of_transaction(),
        }),
    });
    await query.run(db);
    return shortId as ShortUserID;
}

// Get the Google OAuth data if it exists
export async function getUserFromGoogleIdentity(sub: string): Promise<{ shortId: ShortUserID } | null> {
    const query = e.select(e.GoogleIdentity, google => ({
        user: {
            shortId: true,
        },
        filter: e.op(google.sub, "=", sub),
    }));
    const r = await query.run(db);
    return r?.user ? { shortId: r.user.shortId as ShortUserID } : null;
}
