import invariant from "tiny-invariant";

export const makeDoNotCallMe = (tag: string) =>
    (...args: unknown[]) =>
        invariant(
            false,
            `called callback (${tag}) with ${JSON.stringify(args)} before ready`,
        );
