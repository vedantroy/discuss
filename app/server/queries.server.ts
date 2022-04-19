import { User } from "dbschema/edgeql-js/modules/default";
import db, { e, t } from "~/server/edgedb.server";

// Get the Google OAuth data if it exists
export async function getUserFromGoogleIdentity(sub: string): Promise<{ shortId: string } | null> {
    const query = e.select(e.GoogleIdentity, google => ({
        user: {
            shortId: true,
        },
        filter: e.op(google.sub, "=", sub),
    }));
    const r = await query.run(db);
    return r?.user || null;
}

// async function setKey(key: string, value: string): Promise<void> {
//    const query = e.insert(e.Pair, { key, value })
//        .unlessConflict(pair => ({
//            // TODO: Given that there's an exclusive constraint, I have
//            // no idea if this works (it might just throw an error)
//            on: pair.key,
//            else: e.update(pair, () => ({ set: { value } })),
//        }));
//    await query.run(db);
// }
//
// async function getKey(key: string): Promise<string | null> {
//    const query = e.select(e.Pair, pair => ({
//        value: true,
//        filter: e.op(pair.key, "=", key),
//        limit: 1,
//    }));
//    const result = await query.run(db);
//    return result ? result.value : null;
// }
//
// export const KV = { set: setKey, get: getKey };
