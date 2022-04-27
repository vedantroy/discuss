import db, { e } from "../edgedb.server";
import type { ShortUserID, UserPreview } from "./common";

export const getUserPreview = async (userId: ShortUserID): Promise<UserPreview | null> => {
    const query = e.select(e.User, user => ({
        image: true,
        displayName: true,
        limit: 1,
        filter: e.op(user.shortId, "=", userId),
    }));
    const r = await query.run(db);
    if (r === null) return null;
    return { ...r, shortId: userId };
};
