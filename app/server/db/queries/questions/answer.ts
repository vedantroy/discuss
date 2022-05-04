import { ShortQuestionID, ShortUserID } from "~/server/model/types";
import db, { e } from "../../edgedb.server";
import { userFromId } from "../utils/queries";

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
