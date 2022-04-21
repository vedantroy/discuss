import * as edgedb from "edgedb";
import { ConnectConfig } from "edgedb/dist/conUtils";
import invariant from "tiny-invariant";
import e from "~/../dbschema/edgeql-js";

let db: edgedb.Client;

declare global {
    var __db: edgedb.Client | undefined;
    namespace NodeJS {
        interface ProcessEnv {
            EDGEDB_PORT: string;
        }
    }
}

const production = process.env.NODE_ENV === "production";
const EDGEDB_PORT = parseInt(process.env.EDGEDB_PORT);
invariant(!isNaN(EDGEDB_PORT), `invalid port: ${process.env.EDGEDB_PORT}`);

const config: ConnectConfig = {
    port: EDGEDB_PORT,
    tlsSecurity: production ? "default" : "insecure",
};

if (production) {
    db = edgedb.createClient(config);
} else {
    if (!global.__db) {
        global.__db = edgedb.createClient(config);
    }
    db = global.__db;
}

export default db;
export { e };
