import { Club, User } from "dbschema/edgeql-js/modules/default";
import _ from "lodash";
import { nanoid } from "nanoid";
import invariant from "tiny-invariant";
import type { Brand } from "ts-brand";
import { PDFPost } from "~/../dbschema/edgeql-js/types";
import { Rect } from "~/components/PDFWindow/types";
import db, { e } from "~/server/edgedb.server";

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
export type ShortClubID = Brand<string, "ShortClubID">;
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
            createdAt: e.datetime_of_transaction(),
        }),
    });
    await query.run(db);
    return shortId as ShortUserID;
}

export const DocumentStatusCode = {
    MISSING: "missing",
    VALID: "valid",
} as const;
type DocumentStatusCode = typeof DocumentStatusCode;
export type DocumentPayload<T> = {
    docName: string;
    clubName: string;
    clubId: ShortClubID;
    docCtx: T;
};
export type DocumentStatus<T> =
    | { type: DocumentStatusCode["MISSING"] }
    | { type: DocumentStatusCode["VALID"]; payload: DocumentPayload<T> };

export type ShortDocumentID = Brand<string, "ShortDocumentID">;

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

// https://github.com/remix-run/remix/discussions/2948
// the type stuff might be irrelevant, since I might end up having each doc underneath its own prefix
// (that is simpler, so I suspect I will end up going w/ that approach)
export async function getPDFAndClub(
    docId: ShortDocumentID,
    userId?: ShortUserID | null,
): Promise<DocumentStatus<PDFContext>> {
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
        return { type: DocumentStatusCode.MISSING };
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
        return { type: DocumentStatusCode.MISSING };
    }

    return {
        type: DocumentStatusCode.VALID,
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

type CommonPostProps = {
    userId: ShortUserID;
    title: string;
    content: string;
};

type PDFPostProps = {
    document: ShortDocumentID;

    page: number;
    excerptRect: Rect;
    anchorIdx: number;
    focusIdx: number;
    anchorOffset: number;
    focusOffset: number;
    rects: Rect[];
    excerpt: string;
};

export async function createPDFPost(props: CommonPostProps & PDFPostProps): Promise<ShortDocumentID> {
    const shortId = nanoid();
    const query = e.insert(e.PDFPost, {
        shortId,
        createdAt: e.datetime_of_transaction(),
        title: props.title,
        content: props.content,
        score: 0,
        user: e.select(e.User, user => ({ limit: 1, filter: e.op(user.shortId, "=", props.userId) })),
        excerptRect: e.insert(e.PDFRect, props.excerptRect),
        rects: e.set(...props.rects.map(r => e.insert(e.PDFRect, r))),
        document: e.select(e.PDF, doc => ({ limit: 1, filter: e.op(doc.shortId, "=", props.document) })),
        anchorIdx: props.anchorIdx,
        focusIdx: props.focusIdx,
        anchorOffset: props.anchorOffset,
        focusOffset: props.focusOffset,
        page: props.page,
        excerpt: props.excerpt,
    });
    console.log("RUNNING");
    console.log(query.toEdgeQL());

    await query.run(db);
    return shortId as ShortDocumentID;
}
