// TODO: Remove the invariants & just use if-stmts instead
// TODO: Stop internal state from being a ref and just use useMemo
// TODO: Implement zoom & search ...
import _ from "lodash";
import type { PDFPageProxy } from "pdfjs-dist";
import { RenderingCancelledException, renderTextLayer } from "pdfjs-dist";
import { RenderParameters, RenderTask, TextContent } from "pdfjs-dist/types/src/display/api";
import { PageViewport } from "pdfjs-dist/types/web/interfaces";
import React, { memo, useLayoutEffect } from "react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import invariant from "tiny-invariant";
import { Comment, makeSelectionRegex, stringifyComments } from "./deepLink";
import gif from "./loading-icon.gif";
import { makeRects } from "./selection";

// fromId(toId(x)) = x
// (not literally though)
function toId(page: number, n: number) {
    // If selectors start w/ a number we need to use annoying things like
    // CSS.escape
    // https://stackoverflow.com/questions/20306204/using-queryselector-with-ids-that-are-numbers
    return `t${page}-${n}`;
}

function fromId(id: string): [number, number] {
    const [page, n] = id.split("-");
    return [parseInt(page.slice(1)), parseInt(n)];
}

const InternalState = {
    CANVAS_NONE: "canvas_none",
    CANVAS_RENDERING: "canvas_rendering",
    CANVAS_RERENDERING: "canvas_rerendering",
    CANVAS_DONE: "canvas_done",
    ERROR: "error",
};
type InternalState = typeof InternalState[keyof typeof InternalState];

export const RenderState = {
    RENDER: "render",
    DESTROY: "destroy",
    NONE: "none",
} as const;
export type RenderState = typeof RenderState[keyof typeof RenderState];

type PageProps = {
    state: RenderState;
    renderFinished?: (n: number) => void;
    destroyFinished?: (n: number) => void;
    page?: PDFPageProxy;
    pageNum: number;
    viewport: PageViewport;
    style?: CSSProperties;
    outstandingRender: number | null;
    comments: Comment[];
};

function renderGraphics(
    { canvasRef, viewport, page, renderTaskRef, outstandingRender, pageNum, renderFinished, setInternalState }: {
        pageNum: number;
        renderFinished: ((n: number) => void) | undefined;
        page: PDFPageProxy;
        canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
        renderTaskRef: React.MutableRefObject<RenderTask | null>;
        outstandingRender: number | null;
        setInternalState: any;
        viewport: PageViewport;
    },
) {
    const { current: canvas } = canvasRef;
    invariant(canvas, `invalid canvas`);
    const ctx = canvas.getContext("2d");
    invariant(ctx, `invalid canvas context`);

    const renderArgs: RenderParameters = {
        canvasContext: ctx,
        viewport,
    };
    const task = page.render(renderArgs);
    renderTaskRef.current = task;
    task.promise
        .then(() => {
            renderTaskRef.current = null;
            setInternalState(InternalState.CANVAS_DONE);
            if (pageNum === outstandingRender) {
                console.log(`${pageNum}: render callback`);
                invariant(renderFinished, `no render callback when render finished`);
                renderFinished(pageNum);
            } else {
                console.log(`${pageNum} no render callback b/c ${outstandingRender}`);
            }
        })
        .catch((e: unknown) => {
            const isCancel = e instanceof RenderingCancelledException;
            if (!isCancel) {
                setInternalState(InternalState.ERROR);
                console.log("ERROR: " + pageNum);
                console.log(e);
            } else {
                console.log(`${pageNum}: cancel`);
            }
        });
}

const getNum = (x: string, name: string) => {
    const i = parseFloat(x);
    invariant(isFinite(i), `invalid (${name}): ${x}`);
    return i;
};

function Page(
    { state, page, pageNum, viewport, renderFinished, outstandingRender, destroyFinished, style = {}, comments }:
        PageProps,
) {
    const [textInfo, setTextInfo] = useState<{ html: string } | null>(null);
    // we get comment info in some form (as pure API data)
    // we normalize the comment info (we can do that inside the useEffect)
    // we make rectangles + some metadata (the title, necessary info for if we click we make a link)
    // we render commment components
    // we use onmousemove + something inside the page manager + rtree.js to find intersecting comments
    // in the comment display bar (@ the bottom), we also use the comments and render them as clickable links
    // so the comment data must go in to 2 places
    // doesn't seem like worth using redux b/c we don't need to update anything - can prop drill

    // const [rects, setRects] =

    const textContent = useRef<TextContent | null>(null);
    const textContentPromise = useRef<{ p: Promise<TextContent> | null }>({ p: null });

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<RenderTask>(null);
    const [internalState, setInternalState] = useState<InternalState>(InternalState.CANVAS_NONE);
    const { width, height } = viewport;

    const pageTextId = `page-${pageNum}`;

    useEffect(() => {
        if (!textInfo?.html) return;

        type Comment = {
            anchorId: string;
            focusId: string;
            anchorOffset: number;
            focusOffset: number;
        };
        const comments: Comment[] = [{
            anchorId: toId(pageNum, 1),
            focusId: toId(pageNum, 5),
            anchorOffset: 1,
            focusOffset: 2,
        }];

        if (comments.length === 0) return;
        const pageTextContainer = document.getElementById(pageTextId);
        if (!pageTextContainer) return;

        invariant(pageTextContainer, `id!!!!: ${pageTextId} not found`);
        invariant(pageTextContainer.innerHTML === textInfo.html, `stale layout (use useLayoutEffect)`);

        const ids = new Set(
            comments.flatMap(c => ["#" + c.anchorId, "#" + c.focusId]),
        );
        const spans = Array.from(pageTextContainer.querySelectorAll<HTMLSpanElement>(Array.from(ids).join(", ")));
        const idToSpan = _.fromPairs(spans.map(span => [span.id, span]));

        for (const { anchorId, focusId } of comments) {
            const start = idToSpan[anchorId];
            const end = idToSpan[focusId];

            invariant(start, `no element with id: ${anchorId}`);
            invariant(end, `no element with id: ${focusId}`);
            const rects = makeRects(start, end);
        }

        console.log(spans);
    }, [textInfo?.html, comments]);

    // useEffect(() => {
    //    if (textInfo) {
    //        const { html } = textInfo;
    //        // For 10_000 comments on a page, it takes ~ 20 ms max
    //        // There's no point recycling this regex ...
    //        const regexp = makeSelectionRegex(comments, pageNum);
    //        if (regexp === null) return;

    //        const matches = html.matchAll(regexp);
    //        for (const match of matches) {
    //            const [_, s_id, s_top, s_left, s_transformX] = match;
    //            const id = getNum(s_id, "id");
    //            const top = getNum(s_top, "top");
    //            const left = getNum(s_left, "left");
    //            const transformX = getNum(s_transformX, "transformX");

    //            console.log(id, top, left, transformX);
    //        }
    //        console.log([...matches]);
    //        invariant(matches !== null, `no matches for regexp: ${regexp}`);
    //    }
    // }, [textInfo?.html]);

    const stateDescription = `(internal=${internalState}, render=${state}, page=${pageNum})`;

    function deleteCanvas(state: InternalState) {
        const { current: canvas } = canvasRef;
        if (!canvas) {
            console.trace();
            invariant(false, "foo");
        }
        // PDF.js viewer states zeroing width/height
        // causes Firefox to release graphics resources immediately
        // reducing memory consumption
        canvas.width = 0;
        canvas.height = 0;
        setInternalState(state);
    }

    useEffect(() => {
        let cancel = false;
        if (page === undefined) return;
        if (textContentPromise.current.p === null) {
            textContentPromise.current = { p: page.getTextContent() };
        }

        async function go() {
            if (state !== RenderState.RENDER) return;
            const frag = document.createDocumentFragment();
            if (textContent.current === null) {
                textContent.current = await textContentPromise.current.p;
            }
            if (cancel) return;
            const task = renderTextLayer({
                // @ts-ignore https://github.com/mozilla/pdf.js/issues/14716
                container: frag,
                viewport,
                textContent: textContent.current!!,
            });
            try {
                await task.promise;
                if (!cancel) {
                    let rootElement: HTMLDivElement | null = document.createElement("div");
                    rootElement.appendChild(frag);
                    const textHTML = rootElement.innerHTML;

                    let id = 0;
                    // This is ok -- b/c PDF.JS escapes < & > so we won't overwrite content
                    // in the doc itself
                    const withIds = textHTML.replace(/<span/g, () => `<span id="${toId(pageNum, id++)}"`);

                    // TODO: Does this cause actual GC? Do we even need this line? Does it do anything?
                    // (I suspect answers are all no)
                    rootElement = null;
                    // TODO: delete comments here or in the other place?
                    setTextInfo({ html: withIds });
                }
            } catch (e) {
                console.log("TEXT RENDER ERROR");
                console.error(e);
            }
        }
        go();
        return () => {
            cancel = true;
        };
    }, [page, width, height, state]);

    useEffect(() => {
        const internal = internalState;
        const assertInvalid = () => invariant(false, `invalid: ${stateDescription}`);

        switch (state) {
            case RenderState.NONE:
                switch (internal) {
                    case InternalState.CANVAS_DONE:
                    case InternalState.CANVAS_RENDERING:
                    case InternalState.CANVAS_RENDERING:
                        assertInvalid();
                }
                break;
            case RenderState.RENDER:
                switch (internal) {
                    case InternalState.CANVAS_DONE:
                    case InternalState.CANVAS_RERENDERING:
                    case InternalState.CANVAS_RENDERING:
                        setInternalState(InternalState.CANVAS_RERENDERING);
                        if (renderTaskRef.current) {
                            renderTaskRef.current.cancel();
                        }
                        invariant(canvasRef.current, `no canvas`);
                        canvasRef.current.width = width;
                        canvasRef.current.height = height;
                        renderGraphics({
                            canvasRef,
                            viewport,
                            renderFinished,
                            renderTaskRef,
                            pageNum,
                            setInternalState,
                            outstandingRender,
                            page: page!!,
                        });
                        break;
                    case InternalState.CANVAS_NONE:
                        console.log(`${pageNum}: Starting 1st render since load`);
                        setInternalState(InternalState.CANVAS_RENDERING);
                }
                break;
            case RenderState.DESTROY:
                switch (internal) {
                    case InternalState.CANVAS_NONE:
                        break;
                    case InternalState.CANVAS_RERENDERING:
                    case InternalState.CANVAS_RENDERING:
                        // This can happen if we are resizing (thus re-rendering)
                        // but @ the same time need to destroy the page
                        if (renderTaskRef.current) {
                            renderTaskRef.current.cancel();
                        }
                    case InternalState.CANVAS_DONE:
                        invariant(destroyFinished, `Invalid cleanup callback: ${stateDescription}`);
                        deleteCanvas(InternalState.CANVAS_NONE);
                        console.log(`${pageNum}: notifying destroy`);
                        destroyFinished(pageNum);
                }
                break;
            default:
                invariant(false, `invalid render state: ${state}`);
        }
    }, [state, viewport.width, viewport.height]);

    useEffect(() => {
        if (internalState === InternalState.CANVAS_RENDERING) {
            renderGraphics({
                canvasRef,
                viewport,
                renderFinished,
                renderTaskRef,
                pageNum,
                setInternalState,
                outstandingRender,
                page: page!!,
            });
        }
    }, [internalState === InternalState.CANVAS_RENDERING]);

    const styles = { ...style, width, height };
    // Seems like Tailwind CSS wasn't working for these
    const loadingStyles = {
        background: `url(${gif})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "white",
    };

    return (internalState === InternalState.CANVAS_RENDERING || internalState === InternalState.CANVAS_DONE
            || internalState === InternalState.CANVAS_RERENDERING)
        ? (
            <div data-page={pageNum} className="shadow relative" style={{ ...styles, width, height }}>
                <canvas ref={canvasRef} width={width} height={height} />
                {textInfo
                    ? (
                        <div
                            id={pageTextId}
                            style={{ width, height }}
                            className="PageText"
                            dangerouslySetInnerHTML={{ __html: textInfo.html }}
                        >
                        </div>
                    )
                    : null}
                <div
                    className="inset-0 absolute"
                    style={{
                        width,
                        height,
                        zIndex: internalState === InternalState.CANVAS_DONE ? -1 : 1,
                        ...loadingStyles,
                    }}
                >
                </div>
            </div>
        )
        : (
            <div
                data-page={pageNum}
                style={{
                    ...loadingStyles,
                    ...styles,
                }}
                className="shadow"
            >
                {internalState === InternalState.ERROR ? "error" : ""}
            </div>
        );
}

// export default memo(Page);
export default Page;