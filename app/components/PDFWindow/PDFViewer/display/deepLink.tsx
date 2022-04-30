import { PostHighlight } from "../../types";
import { MouseUpContext } from "./ViewerInternal";

type DeepLinkParams = Record<
    "aId" | "fId" | "aOff" | "fOff" | "page" | "pageOffset",
    string
>;

export function getDeepLinkParams(
    ctx: MouseUpContext,
    pageOffset: number,
): DeepLinkParams {
    const {
        page,
        anchorNode: { id: aId },
        focusNode: { id: fId },
        anchorOffset: aOff,
        focusOffset: fOff,
    } = ctx;
    return {
        page: page.toString(),
        aId,
        fId,
        aOff: aOff.toString(),
        fOff: fOff.toString(),
        pageOffset: pageOffset.toString(),
    };
}

export const DEEPLINK_HIGHLIGHT_ID = "deeplink_highlight";
export function getDeepLinkHighlight(params: URLSearchParams): null | PostHighlight {
    const aId = params.get("aId");
    const fId = params.get("fId");
    const aOff = params.get("aOff");
    const fOff = params.get("fOff");
    const page = params.get("page");

    if (!(aId && fId && aOff && fOff && page)) {
        return null;
    }

    return {
        focusOffset: parseInt(fOff),
        anchorOffset: parseInt(aOff),
        page: parseInt(page),
        anchorId: aId,
        focusId: fId,
        id: DEEPLINK_HIGHLIGHT_ID,
        title: "IF_YOU_SEE_THIS_FILE_A_BUG_REPORT",
    };
}
