import db, { e } from "../edgedb.server";
import type { Club, ShortUserID } from "./common";

export async function getAllClubs() {
}

export type UserClubs = {
    admin: Club[];
    writer: Club[];
};

export async function getClubsForUser(userId: ShortUserID): Promise<UserClubs> {
    const q1 = e.select(e.Club, club => ({
        name: true,
        shortId: true,
        filter: e.op(club.accessPolicy.admins.shortId, "=", userId),
    }));
    const userIsAdmin = await q1.run(db);

    const q2 = e.select(e.Club, club => ({
        name: true,
        shortId: true,
        filter: e.op(club.accessPolicy.writers.shortId, "=", userId),
    }));
    const userIsWriter = await q2.run(db);
    return {
        admin: userIsAdmin,
        writer: userIsWriter,
    };
}
