import _ from "lodash";
import invariant from "tiny-invariant";
import { Rect } from "~/components/PDFWindow/types";

export type SubmitContext = {
    left: number;
    top: number;
    width: number;
    height: number;
    rects: Rect[];
    page: number;
};

export type SubmitContextSerialized = {
    ltwh: string;
    rects: string;
    p: string;
};

export function toURLSearchParams(ctx: SubmitContext): SubmitContextSerialized {
    const { left, top, width, height, rects, page } = ctx;
    return {
        ltwh: [left, top, width, height].join(","),
        rects: rects.map(r => `${r.x},${r.y},${r.width},${r.height}`).join(","),
        p: page.toString(),
    };
}

function deserializeCommaArray(x: string): number[] {
    return x.split(",").map(v => {
        const r = parseInt(v);
        invariant(!isNaN(r), `Invalid number: ${v}`);
        return r;
    });
}

export function fromURLSearchParams(ctx: SubmitContextSerialized): SubmitContext {
    const raw = JSON.stringify(ctx);
    const msg = `invalid submission context: ${raw}`;
    invariant(typeof ctx.ltwh === "string", "ltwh: " + msg);
    invariant(typeof ctx.p === "string", "page: " + msg);
    invariant(typeof ctx.rects === "string", "rects: " + msg);

    const { ltwh: rawLtwh, rects: rawRects, p: rawPage } = ctx;
    const ltwh = deserializeCommaArray(rawLtwh);
    const rectValues = deserializeCommaArray(rawRects);
    const rects: Rect[] = _.chunk(rectValues, 4).map(([left, top, width, height]) => ({
        x: left,
        y: top,
        width,
        height,
    }));

    const page = parseInt(rawPage);
    invariant(!isNaN(page), `invalid page: ${rawPage}`);

    return {
        left: ltwh[0],
        top: ltwh[1],
        width: ltwh[2],
        height: ltwh[3],
        page,
        rects,
    };
}
