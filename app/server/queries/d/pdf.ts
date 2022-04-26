import { PDFPost } from "dbschema/edgeql-js";
import _ from "lodash";
import invariant from "tiny-invariant";
import db, { e } from "~/server/edgedb.server";
import { ClubResource, DocumentPayload, ObjectStatusCode, ShortClubID, ShortDocumentID, ShortUserID } from "../common";

// Gonna flex my type checking on you
const pdfHighlightFields = [
    "title",
    "shortId",
    "page",
    "anchorIdx",
    "focusIdx",
    "anchorOffset",
    "focusOffset",
] as const;
type PDFHighlightField = typeof pdfHighlightFields[number];
export type PDFContext = {
    url: string;
    highlights: Array<Pick<PDFPost, PDFHighlightField>>;
};

export async function getPDFAndClub(
    docId: ShortDocumentID,
    userId?: ShortUserID | null,
): Promise<ClubResource<DocumentPayload<PDFContext>>> {
    const query = e.select(e.Document, doc => ({
        // __type__: {
        //    name: true,
        // },
        club: {
            public: true,
            shortId: true,
            name: true,
        },
        name: true,
        filter: e.op(doc.shortId, "=", docId),
        limit: 1,
    }));

    const r = await query.run(db);
    if (r === null) {
        return { type: ObjectStatusCode.MISSING };
    }

    const { name: docName, club } = r;
    if (!club.public) {
        throw new Error(`private clubs not implemented yet`);
    }

    // if (r.__type__.name === "PDF") {
    // } else {
    //    throw new Error(`unknown type: ${JSON.stringify(r.__type__)}`);
    // }

    const docCtxQuery = e.select(e.PDF, pdf => ({
        url: true,
        posts: _.fromPairs(pdfHighlightFields.map(k => [k, true])) as Record<PDFHighlightField, true>,
        filter: e.op(pdf.shortId, "=", docId),
        limit: 1,
    }));

    const docCtx = await docCtxQuery.run(db);
    if (docCtx === null) {
        // This could happen if the document was deleted since the last query
        // But what's the realistic chance of that happening?
        console.log(`Suspicious delete: ${docId}`);
        invariant(false, `If this happens & it's legit, just remove this invariant`);
        return { type: ObjectStatusCode.MISSING };
    }

    return {
        type: ObjectStatusCode.VALID,
        payload: {
            docName,
            clubName: club.name,
            clubId: club.shortId as ShortClubID,
            docCtx: {
                url: docCtx.url,
                highlights: docCtx.posts,
            },
        },
    };
}
