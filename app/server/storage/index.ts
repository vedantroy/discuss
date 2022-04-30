import adapter from "./adapter-fs";
import { FileStorage } from "./types";

const storage: FileStorage = adapter;
storage.init({ dirs: ["pdf"] });
export default storage;
