import { nanoid } from "nanoid";
import invariant from "tiny-invariant";
import { AccessPolicy, getAuthStatus } from "~/server/model/accessControl";
import {
    ClubResource,
    DocMetadata,
    ObjectStatusCode,
    ShortClubID,
    ShortDocumentID,
    ShortUserID,
} from "~/server/model/types";
import { StoredDocumentID } from "~/server/storage/types";
import db, { e } from "../edgedb.server";
import { accessControlSelector } from "./utils/selectors";

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

export async function getDocumentAuth(
    docId: ShortDocumentID,
    userId?: ShortUserID,
): Promise<ClubResource<{ storageHandle: StoredDocumentID }>> {
    const q = e.select(e.Document, doc => ({
        club: {
            accessPolicy: accessControlSelector,
        },
        storageHandle: true,
        filter: e.op(doc.shortId, "=", docId),
    }));
    const r = await q.run(db);
    if (r === null) return { type: ObjectStatusCode.MISSING };
    const auth = getAuthStatus(r.club.accessPolicy as AccessPolicy, userId);
    if (auth.type !== ObjectStatusCode.VALID) return auth;
    return { ...auth, payload: { storageHandle: r.storageHandle as StoredDocumentID } };
}
