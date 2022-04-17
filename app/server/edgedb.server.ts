import * as edgedb from "edgedb"
//import * as foo from "@/dbschema/edgeql-js"
import e from "~/../dbschema/edgeql-js"
import * as types from "~/../dbschema/edgeql-js/types"

let db: edgedb.Client;

declare global {
	var __db: edgedb.Client | undefined
}

if (process.env.NODE_ENV === "production") {
	db = edgedb.createClient()
} else {
	if (!global.__db) {
		global.__db = edgedb.createClient()
	}
	db = global.__db
}

export default db;
export { e, types }