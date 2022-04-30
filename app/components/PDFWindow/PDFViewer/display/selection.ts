import invariant from "tiny-invariant";
import { Rect } from "../../types";

export type SelectionContext = {
    text: string;
    selectedChildren: HTMLSpanElement[];
    anchorNode: HTMLElement;
    focusNode: HTMLElement;
    anchorOffset: number;
    focusOffset: number;
};

export function makeRects(
    start: HTMLSpanElement,
    end: HTMLSpanElement,
    { x, y, anchorOffset, focusOffset }: {
        x: number;
        y: number;
        anchorOffset: number;
        focusOffset: number;
    },
): Rect[] {
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
            if (span === start || span === end) {
                // We need to account for offsets
                // My own understanding of this code is rough ...
                const cloned = span.cloneNode(true);
                span.parentNode!!.appendChild(cloned);
                const textNode = cloned.firstChild;
                invariant(
                    textNode && textNode?.nodeType === Node.TEXT_NODE,
                    `no text node, found: ${textNode?.nodeName}`,
                );

                const range = new Range();
                if (start === end) {
                    range.setStart(textNode, anchorOffset);
                    range.setEnd(textNode, focusOffset);
                } else if (span === start) {
                    range.setStart(textNode, anchorOffset);
                    range.setEndAfter(textNode);
                } else if (span === end) {
                    range.setStartBefore(textNode);
                    range.setEnd(textNode, focusOffset);
                }

                // TODO: Is this a leak ?
                const wrapper = document.createElement("span");
                range.surroundContents(wrapper);
                const { x: sx, width } = wrapper.getBoundingClientRect();
                // There's a bug here where the y-dimensions of the wrapper
                // are incorrect -- we can brute-force around it by using the
                // y-dims from the original span (since we only care about the x-dimensions)
                const { y: sy, height } = span.getBoundingClientRect();
                cloned.parentNode!!.removeChild(cloned);
                rects.push({ x: sx - x, y: sy - y, width, height });
            } else {
                const { x: sx, y: sy, width, height } = span.getBoundingClientRect();
                rects.push({ x: sx - x, y: sy - y, width, height });
            }
        }
        if (span === end) break;
    }
    return rects;
}

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

    const selectedChildren = [];

    for (const el of children) {
        // only spans contain text
        if (el instanceof HTMLSpanElement && s.containsNode(el, true)) {
            // all selected elements are contiguous
            if (!start) start = el;
            end = el;
            selectedChildren.push(el);
        }
    }

    invariant(start, `invalid start`);
    invariant(end, `invalid end`);

    return {
        text,
        anchorNode: start,
        focusNode: end,
        anchorOffset: s.anchorOffset,
        focusOffset: s.focusOffset,
        // ancestor: c.nodeType === Node.TEXT_NODE ? c.parentElement!! : c as HTMLElement,
        selectedChildren,
    };
}
