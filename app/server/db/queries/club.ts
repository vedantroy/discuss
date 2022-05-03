import { nanoid } from "nanoid";
import invariant from "tiny-invariant";
import { Document as DBDocument } from "~/../dbschema/edgeql-js/types";
import { AccessPolicy, getAuthStatus } from "~/server/model/accessControl";
import {
    ClubResource,
    ObjectStatusCode,
    ShortClubID,
    ShortDocumentID,
    ShortUserID,
} from "~/server/model/types";
import { StoredDocumentID } from "~/server/storage/types";
import db, { e } from "../edgedb.server";
import { accessControlSelector } from "./utils/selectors";

type Document = Pick<DBDocument, "name"> & { shortId: ShortDocumentID };
export type ClubWithDocuments = {
    name: string;
    documents: Array<Document>;
};

export async function getClubAuth(
    clubId: ShortClubID,
    userId?: ShortUserID,
): Promise<ClubResource<null>> {
    const q = e.select(e.Club, club => ({
        accessPolicy: accessControlSelector,
        filter: e.op(club.shortId, "=", clubId),
    }));
    const r = await q.run(db);
    if (r === null) return { type: ObjectStatusCode.MISSING };
    return getAuthStatus(r.accessPolicy as AccessPolicy, userId);
}

export async function getClubIfViewable(
    clubId: ShortClubID,
    userId?: ShortUserID,
): Promise<ClubResource<ClubWithDocuments>> {
    const q = e.select(e.Club, club => ({
        name: true,
        documents: {
            name: true,
            shortId: true,
        },
        accessPolicy: accessControlSelector,
        filter: e.op(club.shortId, "=", clubId),
    }));
    const r = await q.run(db);
    if (!r) return { type: ObjectStatusCode.MISSING };
    const { accessPolicy, ...rest } = r;
    const withoutPayload = getAuthStatus(accessPolicy as AccessPolicy, userId);
    if (withoutPayload.type === ObjectStatusCode.VALID) {
        return {
            ...withoutPayload,
            payload: { ...rest, documents: r.documents as Document[] },
        };
    }
    return withoutPayload;
}

type CreateClub = {
    name: string;
    description: string;
    isPublic: boolean;
    creatorId: ShortUserID;
};

export async function createClub(
    { isPublic, creatorId, name, description }: CreateClub,
): Promise<ShortClubID> {
    invariant(isPublic, `creating private clubs not supported yet`);

    const id = nanoid();
    const q = e.insert(e.Club, {
        accessPolicy: e.insert(e.AccessPolicy, {
            public: isPublic,
            writers: e.set(),
            // todo: this is currently a lil broken
            admins: e.select(e.User, user => ({
                filter: e.op(user.shortId, "=", creatorId),
            })),
        }),
        name,
        description,
        shortId: id,
    });

    await q.run(db);
    return id as ShortClubID;
}
