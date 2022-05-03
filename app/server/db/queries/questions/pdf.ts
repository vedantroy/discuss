import {
    Answer as DBAnswer,
    PDF,
    PDFRect as DBPDFRect,
    Vote as DBVote,
} from "dbschema/edgeql-js";
import db, { e } from "~/server/db/edgedb.server";
import { AccessPolicy, getAuthStatus } from "~/server/model/accessControl";
import {
    ClubPreview,
    ClubResource,
    ObjectStatusCode,
    ShortClubID,
    ShortQuestionID,
    ShortUserID,
    UserPreview,
} from "~/server/model/types";
import { accessControlSelector } from "../utils/selectors";

export type PDFRect = Pick<DBPDFRect, "height" | "width" | "x" | "y">;
export type MyVote = Pick<DBVote, "up">;
export type Answer = Pick<DBAnswer, "id" | "content" | "score"> & {
    user: UserPreview;
    vote?: MyVote;
    createdAt: string;
};
export type Question = {
    // TODO: Probably type this
    id: string;
    vote?: MyVote;
    shortId: ShortQuestionID;
    title: string;
    rects: PDFRect[];
    excerptRect: PDFRect;
    content: string;
    page: number;
    score: number;
    createdAt: string;
    answers: Array<Answer>;
    user: UserPreview;
    document: Pick<PDF, "shortId"> & { club: ClubPreview };
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

export async function getPDFQuestion(
    id: ShortQuestionID,
    userId?: ShortUserID,
): Promise<QuestionStatus> {
    const query = e.select(e.PDFPost, post => ({
        id: true,
        shortId: true,
        title: true,
        content: true,
        page: true,
        score: true,
        createdAt: true,
        rects: Selectors.RECT,
        excerptRect: Selectors.RECT,
        answers: {
            id: true,
            score: true,
            content: true,
            createdAt: true,
            user: {
                shortId: true,
                displayName: true,
                image: true,
            },
            ...(userId
                ? {
                    votes: {
                        limit: 1,
                        filter: e.op(post.answers.votes.user.shortId, "=", userId),
                        up: true,
                    },
                }
                : {}),
        },
        user: {
            shortId: true,
            displayName: true,
            image: true,
        },
        filter: e.op(post.shortId, "=", id),
        document: {
            shortId: true,
            club: {
                name: true,
                accessPolicy: accessControlSelector,
                shortId: true,
            },
        },
        ...(userId
            ? {
                votes: {
                    limit: 1,
                    filter: e.op(post.votes.user.shortId, "=", userId),
                    up: true,
                },
            }
            : {}),
    }));

    const r = await query.run(db);
    if (r === null) {
        return { type: ObjectStatusCode.MISSING };
    }
    // const shortId = r.document.club.shortId as ShortClubID;
    const auth = getAuthStatus(r.document.club.accessPolicy as AccessPolicy, userId);
    if (auth.type !== ObjectStatusCode.VALID) return auth;

    const { votes, ...rest } = r;

    // @ts-ignore - there is type branding here that I don't want to deal with
    const casted = {
        ...rest,
        createdAt: r.createdAt.toISOString(),
        shortId: r.shortId as ShortQuestionID,
        // todo check this out
        answers: r.answers.map(({ createdAt, votes, ...rest }) => ({
            // shortId: rest.shortId as ShortUserID,
            createdAt: createdAt.toISOString(),
            vote: (votes || [])[0],
            ...rest,
        })) as Array<Answer>,
        vote: (r.votes || [])[0],
    } as Question;

    return {
        type: ObjectStatusCode.VALID,
        callerAccess: auth.callerAccess,
        payload: casted,
    };
}
