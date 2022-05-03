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

type DocAuthWithMetadata = {
    auth: ClubResource<null, unknown>;
    meta: DocMetadata;
};

export async function getDocMetadataWithAuth(
    docId: ShortDocumentID,
    userId?: ShortUserID,
): Promise<DocAuthWithMetadata | null> {
    const query = e.select(e.Document, doc => ({
        club: {
            shortId: true,
            name: true,
            accessPolicy: accessControlSelector,
        },
        name: true,
        filter: e.op(doc.shortId, "=", docId),
        limit: 1,
    }));

    const r = await query.run(db);
    if (r === null) return null;
    const auth = getAuthStatus(r.club.accessPolicy as AccessPolicy, userId);
    const { name, club } = r;
    return {
        auth,
        meta: { docName: name, clubId: club.shortId as ShortClubID, clubName: club.name },
    };
}
