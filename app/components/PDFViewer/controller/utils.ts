import { InternalError } from "./Error";

export function assert(cond: boolean, msg: string) {
    if (!cond) {
        throw new InternalError(msg);
    }
}
