import { Club as DBClub, User as DBUser } from "dbschema/edgeql-js";
import { BaseType, Cardinality, Expression, TypeSet } from "edgedb/dist/reflection";
import type { Brand } from "ts-brand";
import db from "~/server/edgedb.server";
import { e } from "~/server/edgedb.server";

export type CommonPostProps = {
    userId: ShortUserID;
    title: string;
    content: string;
};

export type ShortUserID = Brand<string, "ShortUserID">;
export type ShortClubID = Brand<string, "ShortClubID">;
export type ShortDocumentID = Brand<string, "ShortDocumentID">;
export type ShortQuestionID = Brand<string, "ShortQuestionID">;

export const ObjectStatusCode = {
    MISSING: "missing",
    NEED_INVITE: "need_invite",
    NEED_LOGIN_INFO: "need_login_info",
    VALID: "valid",
} as const;

export type ObjectStatusCode = typeof ObjectStatusCode;

export type DocumentPayload<T> = {
    docName: string;
    clubName: string;
    clubId: ShortClubID;
    docCtx: T;
};

export type ClubResource<T> =
    | { type: ObjectStatusCode["MISSING"] }
    | { type: ObjectStatusCode["NEED_INVITE"] }
    | { type: ObjectStatusCode["NEED_LOGIN_INFO"] }
    | { type: ObjectStatusCode["VALID"]; payload: T };

export type UserPreview = Pick<DBUser, "displayName" | "image"> & { shortId: string };
export type ClubPreview = Pick<DBClub, "shortId" | "name">;

export function canAccessClub(
    club: { shortId: ShortClubID; isPublic: boolean },
    user: ShortUserID | undefined,
): boolean {
    if (!club.isPublic) {
        throw new Error(`private clubs not implemented yet ...`);
    }
    return true;
}

export const userFromId = (userId: ShortUserID) =>
    e.select(e.User, user => ({
        limit: 1,
        filter: e.op(user.shortId, "=", userId),
    }));

export function runQuery(q: Expression<any>): void {
    console.log(q.toEdgeQL());
    q.run(db);
}
