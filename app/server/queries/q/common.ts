import { e } from "~/server/edgedb.server";
import { runQuery, ShortUserID, userFromId } from "../common";

// Use ids instead of short ids b/c only posts have short ids (as of now)
// TODO: Transition to useing ids in all DB queries -- short ids should only be
// used for translations
export const removeVote = async ({ userId, votableUUID }: { userId: ShortUserID; votableUUID: string }) =>
    runQuery(e.delete(e.Vote, vote => ({
        filter: e.op(e.op(vote.user.shortId, "=", userId), "and", e.op(vote.votable.id, "=", e.uuid(votableUUID))),
    })));

export const createVote = async (
    { userId, up, votableUUID }: { userId: ShortUserID; up: boolean; votableUUID: string },
) => runQuery(
    e.insert(e.Vote, {
        user: userFromId(userId),
        up,
        createdAt: e.datetime_of_transaction(),
        votable: e.select(e.Votable, votable => ({ filter: e.op(votable.id, "=", e.uuid(votableUUID)) })),
    }).unlessConflict(vote => ({
        on: e.tuple([vote.votable, vote.user]),
        else: e.update(vote, () => ({
            set: {
                up,
                createdAt: e.datetime_of_transaction(),
            },
        })),
    })),
    { log: false },
);
