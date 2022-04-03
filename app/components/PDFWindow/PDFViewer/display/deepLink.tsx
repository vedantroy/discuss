import { SelectionContext } from "./selection";

type DeepLinkParams = Record<"aId" | "fId" | "aOff" | "bOff", string>;

export function getDeepLinkParams(ctx: SelectionContext): DeepLinkParams {
    return {
        aId: ctx.anchorNode.id,
        fId: ctx.focusNode.id,
        aOff: ctx.anchorOffset.toString(),
        bOff: ctx.focusOffset.toString(),
    };
}

export type Comment = {
    anchorId: number;
    focusId: number;
    anchorOffset: number;
    focusOffset: number;
};

export function stringifyComments(comments: Comment[]): string {
    let out = "";
    for (const c of comments) {
        out += `${c.anchorId}${c.focusId}${c.anchorOffset}${c.focusOffset}`;
    }
    return out;
}

// don't support cross-page highlights, it allows us to keep comments
// rendering tech to a single page (we could do it, we'd just need prop-drilling /
// a state library like redux or zustand)

// https://makandracards.com/makandra/15879-javascript-how-to-generate-a-regular-expression-from-a-string
function escape(s: string) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

export function makeSelectionRegex(comments: Comment[], page: number): null | RegExp {
    if (comments.length === 0) return null;
    const ids = new Set(comments.flatMap(c => [c.anchorId, c.focusId]));

    // TODO (landmine): This regexp *requires* the existence of (top/left/transform) properties or it WILL be buggy
    // We need to double-escape every character
    const regexp = `<span id="${page}-([${
        Array.from(ids).join("|")
    }])".*?left:\\s(.*?)px.*?top:\\s(.*?)px.+?.*?transform:\\sscaleX\\((.*?)\\)`;
    return new RegExp(regexp, "g");
}
