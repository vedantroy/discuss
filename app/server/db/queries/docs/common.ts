import { AccessPolicy, getAuthStatus } from "~/server/model/accessControl";
import {
    ClubResource,
    DocMetadata,
    ShortClubID,
    ShortDocumentID,
    ShortUserID,
} from "~/server/model/types";
import db, { e } from "../../edgedb.server";
import { accessControlSelector } from "../utils/selectors";

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
