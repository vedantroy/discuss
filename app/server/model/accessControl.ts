import { ClubResource, ObjectStatusCode, ShortUserID } from "./types";

type WithShortId = { shortId: ShortUserID };
export type AccessPolicy = { admins: WithShortId[]; writers: WithShortId[]; public: boolean };
export function getAuthStatus(
    policy: AccessPolicy,
    userId?: ShortUserID,
): ClubResource<null> {
    if (!userId) {
        if (!policy.public) return { type: ObjectStatusCode.NEED_LOGIN_INFO };
        else {
            return {
                type: ObjectStatusCode.VALID,
                payload: null,
                callerAccess: { admin: false, writer: false },
            };
        }
    }

    const admin = policy.admins.some(id => id.shortId === userId);
    const writer = admin || policy.writers.some(id => id.shortId === userId);
    if (!admin && !writer && !policy.public) return { type: ObjectStatusCode.NEED_INVITE };
    return {
        type: ObjectStatusCode.VALID,
        callerAccess: { admin, writer: writer },
        payload: null,
    };
}
