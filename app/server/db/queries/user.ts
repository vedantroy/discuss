import { Club, ShortUserID } from "~/server/model/types";
import { UserPreview } from "~/server/model/types";
import db, { e } from "../edgedb.server";

export const getUserPreview = async (
    userId: ShortUserID,
): Promise<UserPreview | null> => {
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

export type UserClubs = {
    admin: Club[];
    writer: Club[];
};

export async function getClubsForUser(userId: ShortUserID): Promise<UserClubs> {
    // todo: computed props + 1 query
    const q1 = e.select(e.Club, club => ({
        name: true,
        shortId: true,
        description: true,
        filter: e.op(club.accessPolicy.admins.shortId, "=", userId),
    }));
    const userIsAdmin = await q1.run(db);
    const q2 = e.select(e.Club, club => ({
        name: true,
        shortId: true,
        description: true,
        filter: e.op(club.accessPolicy.writers.shortId, "=", userId),
    }));
    const userIsWriter = await q2.run(db);
    return {
        admin: userIsAdmin,
        writer: userIsWriter,
    } as UserClubs;
}

export type UserWithClub = {
    displayName: string;
    shortId: ShortUserID;
    clubs: UserClubs;
};

// todo not efficient
export async function getAllUsersWithClubs(): Promise<Array<UserWithClub>> {
    const q = e.select(e.User, _ => ({ shortId: true, displayName: true }));
    const users = await q.run(db);
    const withClubs = await Promise.all(users.map(async u => {
        const clubs = await getClubsForUser(u.shortId as ShortUserID);
        return {
            ...u,
            clubs,
        };
    }));
    return withClubs as Array<UserWithClub>;
}
