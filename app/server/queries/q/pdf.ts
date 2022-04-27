import { Answer as DBAnswer, PDF, PDFRect as DBPDFRect, Vote as DBVote } from "dbschema/edgeql-js";
import db, { e } from "~/server/edgedb.server";
import {
    canAccessClub,
    ClubPreview,
    ClubResource,
    ObjectStatusCode,
    ShortClubID,
    ShortQuestionID,
    ShortUserID,
    userFromId,
    UserPreview,
} from "../common";

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
    document: Pick<PDF, "shortId" | "url" | "baseHeight"> & { club: ClubPreview };
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

export async function getPDFQuestion(id: ShortQuestionID, userId?: ShortUserID): Promise<QuestionStatus> {
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
            url: true,
            shortId: true,
            club: {
                name: true,
                public: true,

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
    const shortId = r.document.club.shortId as ShortClubID;
    const isPublic = r.document.club.public;
    canAccessClub({ shortId, isPublic }, userId);

    const { votes, ...rest } = r;

    return {
        type: ObjectStatusCode.VALID,
        payload: {
            ...rest,
            createdAt: r.createdAt.toISOString(),
            shortId: r.shortId as ShortQuestionID,
            answers: r.answers.map(({ createdAt, ...rest }) => ({ createdAt: createdAt.toISOString(), ...rest })),
            vote: r.votes[0],
        },
    };
}

type SubmitAnswer = {
    userId: ShortUserID;
    questionId: ShortQuestionID;
    content: string;
};

export async function submitAnswer({ userId, questionId, content }: SubmitAnswer) {
    const query = e.insert(e.Answer, {
        user: userFromId(userId),
        post: e.select(e.Post, post => ({
            limit: 1,
            filter: e.op(post.shortId, "=", questionId),
        })),
        content,
        createdAt: e.datetime_of_transaction(),
    });
    await query.run(db);
}
