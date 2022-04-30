export type FileStorage = {
    getFile(path: string): null | Buffer;
    // writeNewFile(path: string): void;
    init(opts: { dirs: string[] }): void;
};
