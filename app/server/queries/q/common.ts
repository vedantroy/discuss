import { e } from "~/server/edgedb.server";
import { runQuery, ShortQuestionID, ShortUserID, userFromId } from "../common";

// TODO: Should we throw err if there's no vote to delete?
export const removeAnswerVote = ({ userId, answerId }: { userId: ShortUserID; answerId: string }) =>
    runQuery(e.delete(e.AnswerVote, vote => ({
        filter: e.op(e.op(vote.user.shortId, "=", userId), "and", e.op(vote.answer.id, "=", e.uuid(answerId))),
    })));

export const removePostVote = ({ userId, postId }: { userId: ShortUserID; postId: ShortQuestionID }) =>
    runQuery(e.delete(e.PostVote, vote => ({
        filter: e.op(e.op(vote.user.shortId, "=", userId), "and", e.op(vote.post.shortId, "=", postId)),
    })));

export const createPostVote = ({ userId, postId, up }: { userId: ShortUserID; postId: ShortQuestionID; up: boolean }) =>
    runQuery(
        e.insert(e.PostVote, {
            user: userFromId(userId),
            post: e.select(e.Post, post => ({ limit: 1, filter: e.op(post.shortId, "=", postId) })),
            createdAt: e.datetime_of_transaction(),
            up,
        }).unlessConflict(vote => ({
            on: e.set(vote.post, vote.user),
            up,
        })),
    );

export const createAnswerVote = ({ userId, answerId, up }: { userId: ShortUserID; answerId: string; up: boolean }) =>
    runQuery(
        e.insert(e.AnswerVote, {
            user: userFromId(userId),
            answer: e.select(e.Answer, answer => ({ limit: 1, filter: e.op(answer.id, "=", e.uuid(answerId)) })),
            createdAt: e.datetime_of_transaction(),
            up,
        }).unlessConflict(vote => ({
            on: e.set(vote.answer, vote.user),
            up,
        })),
    );
