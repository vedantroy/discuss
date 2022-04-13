import _ from "lodash";
import { PostHighlight } from "../PDFWindow/types";

type Ids = Pick<PostHighlight, "anchorId" | "focusId" | "anchorOffset" | "focusOffset">;

export function makeIdToSpan(pageTextContainer: HTMLElement, highlights: Ids[]): Record<string, HTMLSpanElement> {
    const ids = new Set(
        highlights.flatMap(c => ["#" + c.anchorId, "#" + c.focusId]),
    );
    const spans = Array.from(pageTextContainer.querySelectorAll<HTMLSpanElement>(Array.from(ids).join(", ")));
    const idToSpan = _.fromPairs(spans.map(span => [span.id, span]));
    return idToSpan;
}
