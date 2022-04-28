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

const config: ConnectConfig = {
    port: EDGEDB_PORT,
    tlsSecurity: production ? "default" : "insecure",
};

if (production) {
    const EDGEDB_PASSWORD = getenv.string("EDGEDB_PASSWORD");
    const EDGEDB_HOST = getenv.string("EDGEDB_HOST");
    db = edgedb.createClient({
        port: EDGEDB_PORT,
        password: EDGEDB_PASSWORD,
        host: EDGEDB_HOST,
        tlsSecurity: "insecure",
    });
} else {
    if (!global.__db) {
        global.__db = edgedb.createClient({ port: EDGEDB_PORT, tlsSecurity: "insecure" });
    }
    db = global.__db;
}

export default db;
export { e };
