import _ from "lodash";
import invariant from "tiny-invariant";
import { Rect } from "~/components/PDFWindow/types";

export type SubmitContext = {
    url: string;
    left: number;
    top: number;
    width: number;
    height: number;
    rects: Rect[];
    page: number;
    text: string;

    anchorIdx: number;
    focusIdx: number;
    anchorOffset: number;
    focusOffset: number;
};

export type SubmitContextSerialized = {
    ltwh: string;
    rects: string;
    p: string;
    // TODO: This will enable super easy pirating ...
    // (I think this was somewhat inevitable ...)
    url: string;
    text: string;

    anchorIdx: string;
    focusIdx: string;
    anchorOffset: string;
    focusOffset: string;
};

export function toURLSearchParams(ctx: SubmitContext): SubmitContextSerialized {
    const { left, top, width, height, rects, page } = ctx;
    return {
        ltwh: [left, top, width, height].join(","),
        rects: rects.map(r => `${r.x},${r.y},${r.width},${r.height}`).join(","),
        p: page.toString(),
        url: ctx.url,
        text: ctx.text,

        anchorIdx: ctx.anchorIdx.toString(),
        focusIdx: ctx.focusIdx.toString(),
        anchorOffset: ctx.anchorOffset.toString(),
        focusOffset: ctx.focusOffset.toString(),
    };
}

function deserializeCommaArray(x: string): number[] {
    return x.split(",").map(v => {
        const r = parseInt(v);
        invariant(!isNaN(r), `Invalid number: ${v}`);
        return r;
    });
}

function validInt(x: string): number {
    const p = parseInt(x);
    invariant(!isNaN(p), `Invalid number: ${x}`);
    return p;
}

export function fromURLSearchParams(ctx: SubmitContextSerialized): SubmitContext {
    const raw = JSON.stringify(ctx);
    const msg = `invalid submission context: ${raw}`;
    invariant(typeof ctx.ltwh === "string", "ltwh: " + msg);
    invariant(typeof ctx.p === "string", "page: " + msg);
    invariant(typeof ctx.rects === "string", "rects: " + msg);
    invariant(typeof ctx.url === "string", "rects: " + msg);
    invariant(typeof ctx.text === "string", "text: " + msg);

    const { ltwh: rawLtwh, rects: rawRects, p: rawPage } = ctx;
    const ltwh = deserializeCommaArray(rawLtwh);
    const rectValues = deserializeCommaArray(rawRects);
    const rects: Rect[] = _.chunk(rectValues, 4).map((
        [left, top, width, height],
    ) => ({
        x: left,
        y: top,
        width,
        height,
    }));

    const page = parseInt(rawPage);
    invariant(!isNaN(page), `invalid page: ${rawPage}`);

    return {
        url: ctx.url,
        left: ltwh[0],
        top: ltwh[1],
        width: ltwh[2],
        height: ltwh[3],
        page,
        rects,
        text: ctx.text,
        anchorIdx: validInt(ctx.anchorIdx),
        focusIdx: validInt(ctx.focusIdx),
        anchorOffset: validInt(ctx.anchorOffset),
        focusOffset: validInt(ctx.focusOffset),
    };
}
