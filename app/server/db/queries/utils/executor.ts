import { Expression } from "edgedb/dist/reflection";
import db from "../../edgedb.server";

export function runQuery(
    q: Expression<any>,
    { log }: { log: boolean } = { log: false },
): Promise<void> {
    if (log) {
        console.log(q.toEdgeQL());
    }
    return q.run(db);
}
