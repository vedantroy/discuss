import type { Brand } from "ts-brand";

export type FileStorage = {
    createFile(buf: Buffer): Promise<StoredDocumentID>;
    getFile(path: StoredDocumentID): Promise<null | Buffer>;
    // init(opts: { dirs: string[] }): void;
};

export type StoredDocumentID = Brand<string, "StoredDocumentID">;
