import { nanoid } from "nanoid";
import invariant from "tiny-invariant";
import db, { e } from "~/server/edgedb.server";
import { StoredDocumentID } from "~/server/storage/types";
import { ShortClubID, ShortUserID } from "../common";

type CreateClub = {
    name: string;
    description: string;
    isPublic: boolean;
    creatorId: ShortUserID;
};

export async function createClub(
    { isPublic, creatorId, name, description }: CreateClub,
): Promise<ShortClubID> {
    invariant(isPublic, `private clubs not supported yet`);

    const id = nanoid();
    const q = e.insert(e.Club, {
        accessPolicy: e.insert(e.AccessPolicy, {
            public: isPublic,
            writers: e.set(),
            admins: e.select(e.User, user => ({
                filter: e.op(user.shortId, "=", creatorId),
            })),
        }),
        name,
        description,
        shortId: id,
    });

    await q.run(db);
    return id as ShortClubID;
}

type Doc = {
    name: string;
    type: string;
    buf: Buffer;
    docId: StoredDocumentID;
    width: number;
    height: number;
};

export async function createDocs(
    { docs, clubId }: { docs: Doc[]; clubId: ShortClubID },
): Promise<void> {
    await Promise.all(docs.map(async doc => {
        const id = nanoid();
        if (doc.type === "application/pdf") {
            const { docId, name, width, height } = doc;
            const q = e.insert(e.PDF, {
                storageHandle: docId,
                shortId: id,
                name,
                club: e.select(
                    e.Club,
                    club => ({ filter: e.op(club.shortId, "=", clubId), limit: 1 }),
                ),
                baseWidth: width,
                baseHeight: height,
            });
            await q.run(db);
        } else invariant(false, `invalid type ${doc.type}`);
    }));
}
