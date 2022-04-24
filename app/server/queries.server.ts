import * as fs from "fs";
import _ from "lodash";
import { nanoid } from "nanoid";
import invariant from "tiny-invariant";
import type { Brand } from "ts-brand";
import { Answer, Club, PDF, PDFPost, PDFRect as _PDFRect, User } from "~/../dbschema/edgeql-js/types";
import { Rect } from "~/components/PDFWindow/types";
import { reportQuery } from "~/debug/query";
import db, { e } from "~/server/edgedb.server";

export type ShortUserID = Brand<string, "ShortUserID">;
export type ShortClubID = Brand<string, "ShortClubID">;
export type ShortDocumentID = Brand<string, "ShortDocumentID">;
export type ShortQuestionID = Brand<string, "ShortQuestionID">;

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

export const ObjectStatusCode = {
    MISSING: "missing",
    NEED_INVITE: "need_invite",
    NEED_LOGIN_INFO: "need_login_info",
    VALID: "valid",
} as const;

type ObjectStatusCode = typeof ObjectStatusCode;
export type DocumentPayload<T> = {
    docName: string;
    clubName: string;
    clubId: ShortClubID;
    docCtx: T;
};

type ClubResource<T> =
    | { type: ObjectStatusCode["MISSING"] }
    | { type: ObjectStatusCode["NEED_INVITE"] }
    | { type: ObjectStatusCode["NEED_LOGIN_INFO"] }
    | { type: ObjectStatusCode["VALID"]; payload: T };

export type DocumentStatus<T> = ClubResource<DocumentPayload<T>>;
// export type DocumentStatus<T> =
//    | { type: ObjectStatusCode["MISSING"] }
//    | { type: ObjectStatusCode["VALID"]; payload: DocumentPayload<T> };

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

function canAccessClub(club: { shortId: ShortClubID; isPublic: boolean }, user: ShortUserID | undefined): boolean {
    if (!club.isPublic) {
        throw new Error(`private clubs not implemented yet ...`);
    }
    return true;
}

// typescriptify the fuck out of this
type UserPreview = Pick<User, "shortId" | "displayName" | "image">;
type ClubPreview = Pick<Club, "shortId" | "name">;
type PDFRect = Pick<_PDFRect, "height" | "width" | "x" | "y">;

export type Question = {
    title: string;
    rects: PDFRect[];
    excerptRect: PDFRect;
    content: string;
    page: number;
    score: number;
    createdAt: Date;
    answers: Array<Pick<Answer, "content" | "createdAt"> & { user: UserPreview }>;
    user: UserPreview;
    document: Pick<PDF, "shortId" | "url"> & { club: ClubPreview };
};
export type QuestionStatus = ClubResource<Question>;

const Selectors = {
    RECT: {
        x: true,
        y: true,
        width: true,
        height: true,
    },
} as const;

export async function getQuestion(id: ShortQuestionID, userId?: ShortUserID): Promise<QuestionStatus> {
    const query = e.select(e.PDFPost, post => ({
        title: true,
        content: true,
        page: true,
        score: true,
        createdAt: true,
        rects: Selectors.RECT,
        excerptRect: Selectors.RECT,
        answers: {
            content: true,
            createdAt: true,
            user: {
                shortId: true,
                displayName: true,
                image: true,
            },
        },
        user: {
            shortId: true,
            displayName: true,
            image: true,
        },
        filter: e.op(post.shortId, "=", id),
        document: {
            url: true,
            shortId: true,
            club: {
                name: true,
                public: true,
                shortId: true,
            },
        },
    }));

    const r = await query.run(db);
    if (r === null) {
        return { type: ObjectStatusCode.MISSING };
    }
    const shortId = r.document.club.shortId as ShortClubID;
    const isPublic = r.document.club.public;
    canAccessClub({ shortId, isPublic }, userId);

    return {
        type: ObjectStatusCode.VALID,
        payload: r,
    };
}

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

export async function createPDFPost(props: CommonPostProps & PDFPostProps): Promise<ShortQuestionID> {
    // https://github.com/edgedb/edgedb/discussions/3786?sort=top
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

    // buggy :(())
    // const query = e.params(
    //     { rects: e.array(e.tuple({ x: e.int16, y: e.int16, width: e.int16, height: e.int16 })) },
    //     params =>
    //         e.insert(
    //             e.PDFPost,
    //             {
    //                 shortId,
    //                 createdAt: e.datetime_of_transaction(),
    //                 title: props.title,
    //                 content: props.content,
    //                 score: 0,
    //                 user: e.select(e.User, user => ({ limit: 1, filter: e.op(user.shortId, "=", props.userId) })),
    //                 excerptRect: e.insert(e.PDFRect, props.excerptRect),
    //                 rects: e.for(e.array_unpack(params.rects), item =>
    //                     e.insert(e.PDFRect, {
    //                         x: item.x,
    //                         y: item.y,
    //                         width: item.width,
    //                         height: item.height,
    //                     })),
    //                 document: e.select(e.PDF, doc => ({ limit: 1, filter: e.op(doc.shortId, "=", props.document) })),
    //                 anchorIdx: props.anchorIdx,
    //                 focusIdx: props.focusIdx,
    //                 anchorOffset: props.anchorOffset,
    //                 focusOffset: props.focusOffset,
    //                 page: props.page,
    //                 excerpt: props.excerpt,
    //             },
    //         ),
    // );

    // reportQuery({ edgeql: query.toEdgeQL(), durationMs: 0 });
    await query.run(db);
    // reportQuery({ edgeql: query.toEdgeQL(), durationMs: end - start });
    return shortId as ShortQuestionID;
}
