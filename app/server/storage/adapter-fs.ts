import * as fs from "fs";
import { sha256 } from "hash-wasm";
import * as path from "path";
import invariant from "tiny-invariant";
import getenv from "~/vendor/getenv.ts";
import { FileStorage, StoredDocumentID } from "./types";

const ROOT_DIR = getenv.string("FS_ADAPTER_STORAGE_PATH");
const adapter: FileStorage = {
    // init({ dirs }) {
    //    dirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));
    // },
    async getFile(p) {
        invariant(fs.existsSync(ROOT_DIR), `root dir does not exist`);
        const filePath = path.join(ROOT_DIR, p);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        return fs.promises.readFile(filePath);
    },
    async createFile(buf) {
        invariant(fs.existsSync(ROOT_DIR), `root dir does not exist`);
        // a storage optimization if 2 files are the same??
        const hash = await sha256(buf);
        const filePath = path.join(ROOT_DIR, hash);
        console.log("WRITING FILE: " + filePath);
        await fs.promises.writeFile(filePath, buf);
        console.log("DONE WRITING FILE ...");
        return hash as StoredDocumentID;
    },
};

export default adapter;
