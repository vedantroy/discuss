// todo: this is probs bad practice & I need to
// split this it into files by functionality ...
import type { Brand } from "ts-brand";

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

export type DocMetadata = {
    docName: string;
    clubName: string;
    clubId: ShortClubID;
};
export type DocumentPayload<T> = {
    metadata: DocMetadata;
    docCtx: T;
};

export type ClubResource<P, U = unknown> =
    | { type: ObjectStatusCode["MISSING"] }
    | { type: ObjectStatusCode["NEED_INVITE"]; payload?: U }
    | { type: ObjectStatusCode["NEED_LOGIN_INFO"]; payload?: U }
    | {
        type: ObjectStatusCode["VALID"];
        payload: P;
        callerAccess: { admin: boolean; writer: boolean };
    };

export type CommonPostProps = {
    userId: ShortUserID;
    title: string;
    content: string;
};

export type Club = {
    shortId: ShortClubID;
    name: string;
    description: string;
};
