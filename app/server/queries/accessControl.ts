// @ts-nocheck
// Typescript dies on these EdgeQL queries
// That's a shame b/c this is the most complex file in the project (in terms of Typescript) ...

import db, { e } from "../edgedb.server";
import type { Club, ShortDocumentID, ShortUserID } from "./common";

// maybe useful: https://stackoverflow.com/questions/50914805/change-the-return-type-depending-on-the-parameter-value-in-typescript

export interface Options {
    users?: boolean;
}

export async function clubFromDoc(
    docId: ShortDocumentID,
    opts: Options & { users: true },
): Promise<(Club & Pick<DBClub, "users">) | null>;
export async function clubFromDoc(
    docId: ShortDocumentID,
    opts: Options & { users: false },
): Promise<Club | null>;
export async function clubFromDoc(
    docId: ShortDocumentID,
    opts: Options = { users: false },
): Promise<any> {
    const query = e.select(e.Document, doc => ({
        club: {
            public: true,
            shortId: true,
            name: true,
            users: opts.users,
        },
        filter: e.op(doc.shortId, "=", docId),
        limit: 1,
    }));
    const r = await query.run(db);
    return r?.club || null;
}

export async function canEditDocument(
    docId: ShortDocumentID,
    userId?: ShortUserID,
): Promise<Club | null> {
    if (!userId) {
        const q = e.select(e.Document, doc => ({
            club: {
                shortId: true,
                name: true,
            },
            filter: e.op(
                e.op(doc.club.accessPolicy.public, "=", true),
                "and",
                e.op(doc.shortId, "=", docId),
            ),
            limit: 1,
        }));
        return (await q.run(db))?.club || null;
    }

    const q = e.select(e.Document, doc => {
        const userIsWriter = e.op(
            doc.club.accessPolicy.writers.shortId,
            "=",
            userId,
        );
        const userIsAdmin = e.op(doc.club.accessPolicy.admins.shortId, "=", userId);

        return {
            club: {
                shortId: true,
                name: true,
            },
            filter: e.op(
                e.op(doc.shortId, "=", docId),
                "and",
                e.op(
                    e.op(userIsWriter, "or", userIsAdmin),
                    "or",
                    e.op(doc.club.accessPolicy.public, "=", true),
                ),
            ),
            limit: 1,
        };
    });
    return (await q.run(db)).club || null;
}
