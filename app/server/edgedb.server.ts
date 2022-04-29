import * as edgedb from "edgedb";
import { ConnectConfig } from "edgedb/dist/conUtils";
import invariant from "tiny-invariant";
import e from "~/../dbschema/edgeql-js";
import getenv from "~/vendor/getenv.ts/index";

let db: edgedb.Client;

declare global {
    var __db: edgedb.Client | undefined;
}

const production = process.env.NODE_ENV === "production";
const EDGEDB_PORT = getenv.int("EDGEDB_PORT");

console.log(`MODE: ${process.env.NODE_ENV}`);
if (production) {
    const EDGEDB_PASSWORD = getenv.string("EDGEDB_PASSWORD");
    const EDGEDB_HOST = getenv.string("EDGEDB_HOST");
    const config: edgedb.ConnectOptions =  {
                port: EDGEDB_PORT,
                password: EDGEDB_PASSWORD,
                host: EDGEDB_HOST,
                // yes, this is here on purpose
                tlsSecurity: "insecure",
                waitUntilAvailable: 5000,
    }
    console.log(`PRODUCTION DB CONFIG: ${JSON.stringify(config, null, 2)}`)
    db = edgedb.createClient(config);
} else {
    if (!global.__db) {
        global.__db = edgedb.createClient({ port: EDGEDB_PORT, tlsSecurity: "insecure" });
    }
    db = global.__db;
}

export default db;
export { e };
