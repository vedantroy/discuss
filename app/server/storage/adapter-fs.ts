import * as fs from "fs";
import * as path from "path";
import invariant from "tiny-invariant";
import { FileStorage } from "./types";

const ROOT_DIR = "/storage";

const adapter: FileStorage = {
    init({ dirs }) {
        dirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));
    },
    getFile(p) {
        const filePath = path.join(ROOT_DIR, p);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        return fs.readFileSync(filePath);
    },
    // writeNewFile(p, data) {
    // invariant(!fs.existsSync(p), `File ${p} already exists`);
    // fs.writeFileSync(p)
    // }
};

export default adapter;
