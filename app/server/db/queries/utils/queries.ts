import { ShortUserID } from "~/server/model/types";
import { e } from "../../edgedb.server";

export const userFromId = (userId: ShortUserID) =>
    e.select(e.User, user => ({
        limit: 1,
        filter: e.op(user.shortId, "=", userId),
    }));
