import * as edgedb from "edgedb";
import e from "~/../dbschema/edgeql-js";
import getenv from "~/vendor/getenv.ts/index";
import { IS_PRODUCTION } from "../env";

let db: edgedb.Client;

declare global {
    var __db: edgedb.Client | undefined;
}

if (IS_PRODUCTION) {
    const EDGEDB_PORT = getenv.int("EDGEDB_PORT");
    const EDGEDB_PASSWORD = getenv.string("EDGEDB_PASSWORD");
    const EDGEDB_HOST = getenv.string("EDGEDB_HOST");
    const config: edgedb.ConnectOptions = {
        port: EDGEDB_PORT,
        password: EDGEDB_PASSWORD,
        host: EDGEDB_HOST,
        // yes, this is here on purpose
        tlsSecurity: "insecure",
        waitUntilAvailable: 5000,
    };
    console.log(`PRODUCTION DB CONFIG: ${JSON.stringify(config, null, 2)}`);
    db = edgedb.createClient(config);
} else {
    if (!global.__db) {
        global.__db = edgedb.createClient({ port: 5656, tlsSecurity: "insecure" });
    }
    db = global.__db;
}

export default db;
export { e };
