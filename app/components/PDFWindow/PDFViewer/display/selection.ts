import invariant from "tiny-invariant";

type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

// TODO: Handle partial-highlight case
export function makeRects(start: HTMLSpanElement, end: HTMLSpanElement): Rect[] {
    const range = document.createRange();
    range.selectNode(start);
    range.selectNode(end);
    const { commonAncestorContainer: c } = range;
    const spans = (c as HTMLElement).getElementsByTagName("span");

    const rects = [];
    let foundStart = false;
    for (const span of spans) {
        if (span === start) foundStart = true;
        if (foundStart) {
            const rect = span.getBoundingClientRect();
            rects.push(rect);
        }
        if (span === end) break;
    }
    return rects;
}

export type SelectionContext = {
    text: string;
    anchorNode: HTMLElement;
    focusNode: HTMLElement;
    anchorOffset: number;
    focusOffset: number;
};

export function processSelection(s: Selection | null): null | SelectionContext {
    if (s === null) return null;
    if (s.rangeCount === 0) return null;

    const text = s.toString();
    if (text === "") return null;

    const range = s.getRangeAt(0);
    const { commonAncestorContainer: c } = range;

    const children = c.nodeType === Node.TEXT_NODE
        ? [range.commonAncestorContainer.parentElement]
        : (c as HTMLElement).getElementsByTagName("*");

    let start: HTMLSpanElement | null = null;
    let end: HTMLSpanElement | null = null;

    for (const el of children) {
        // only spans contain text
        if (el instanceof HTMLSpanElement && s.containsNode(el, true)) {
            if (!start) start = el;
            end = el;
            console.log("not skip");
            // all selected elements are contiguous
        } else if (el instanceof HTMLSpanElement) {
            console.log("skip");
        }
    }

    invariant(start, `invalid start`);
    invariant(end, `invalid end`);

    return { text, anchorNode: start, focusNode: end, anchorOffset: s.anchorOffset, focusOffset: s.focusOffset };
}
