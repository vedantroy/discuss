// TODO: Remove the invariants & just use if-stmts instead
// TODO: Stop internal state from being a ref and just use useMemo
// TODO: Implement zoom & search ...
import type { PDFPageProxy } from "pdfjs-dist";
import { RenderingCancelledException, renderTextLayer } from "pdfjs-dist";
import { RenderParameters, RenderTask, TextContent } from "pdfjs-dist/types/src/display/api";
import { PageViewport } from "pdfjs-dist/types/web/interfaces";
import React, { memo } from "react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import invariant from "tiny-invariant";
import gif from "./loading-icon.gif";

const InternalState = {
    CANVAS_NONE: "canvas_none",
    CANVAS_RENDERING: "canvas_rendering",
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
    // TODO: remove
    // className?: string;
};

function renderGraphics(
    { canvasRef, viewport, page, renderTaskRef, internalStateRef, outstandingRender, pageNum, renderFinished }: {
        pageNum: number;
        renderFinished: ((n: number) => void) | undefined;
        page: PDFPageProxy;
        canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
        renderTaskRef: React.MutableRefObject<RenderTask | null>;
        outstandingRender: number | null;
        internalStateRef: React.MutableRefObject<InternalState>;
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
            internalStateRef.current = InternalState.CANVAS_DONE;
            renderTaskRef.current = null;
            if (pageNum === outstandingRender) {
                console.log(`${pageNum}: render callback`);
                invariant(renderFinished, `no render callback when render finished`);
                renderFinished(pageNum);
            } else {
                console.log(`skipping b/c ${pageNum} !== ${outstandingRender}`);
            }
        })
        .catch((e: unknown) => {
            internalStateRef.current = InternalState.ERROR;
            console.log("ERROR: " + pageNum);
            console.log(e);
        });
}

function Page(
    { state, page, pageNum, viewport, renderFinished, outstandingRender, destroyFinished, style = {} }: PageProps,
) {
    const [textInfo, setTextInfo] = useState<{ html: string } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const notifyRef = useRef<boolean>(false);
    const renderTaskRef = useRef<RenderTask | null>(null);
    const internalStateRef = useRef<InternalState>(InternalState.CANVAS_NONE);
    const { width, height } = viewport;

    const [canvasExists, setCanvasExists] = useState(false);
    const [error, setError] = useState(false);
    const stateDescription = `(internal=${internalStateRef.current}, render=${state}, page=${pageNum})`;

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
        internalStateRef.current = state;
        setCanvasExists(false);
    }

    useEffect(() => {
        let cancel = false;
        if (page === undefined) return;
        async function go() {
            const frag = document.createDocumentFragment();
            const text = page!!.streamTextContent();
            const task = renderTextLayer({
                // @ts-ignore https://github.com/mozilla/pdf.js/issues/14716
                container: frag,
                viewport,
                textContentStream: text,
            });
            try {
                await task.promise;
                if (!cancel) {
                    let rootElement: HTMLDivElement | null = document.createElement("div");
                    rootElement.appendChild(frag);
                    const text = rootElement.innerHTML;
                    // TODO: Does this cause actual GC? Do we even need this line? Does it do anything?
                    rootElement = null;
                    setTextInfo({ html: text });
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
    }, [page, width, height]);

    useEffect(() => {
        const { current: internal } = internalStateRef;
        const assertInvalid = () => invariant(false, `invalid: ${stateDescription}`);

        switch (state) {
            case RenderState.NONE:
                switch (internal) {
                    case InternalState.CANVAS_DONE:
                    case InternalState.CANVAS_RENDERING:
                        assertInvalid();
                }
                break;
            case RenderState.RENDER:
                switch (internal) {
                    case InternalState.CANVAS_DONE:
                    case InternalState.CANVAS_RENDERING:
                        internalStateRef.current = InternalState.CANVAS_RENDERING;
                        console.log(`${pageNum}: doing re-render b/c of viewport change`);
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
                            internalStateRef,
                            outstandingRender,
                            page: page!!,
                        });
                        break;
                    case InternalState.CANVAS_NONE:
                        console.log(`${pageNum}: Starting 1st render since load`);
                        internalStateRef.current = InternalState.CANVAS_RENDERING;
                        notifyRef.current = false;
                        setCanvasExists(true);
                }
                break;
            case RenderState.DESTROY:
                switch (internal) {
                    case InternalState.CANVAS_NONE:
                        break;
                    case InternalState.CANVAS_RENDERING:
                        // This can happen if we are resizing (thus re-rendering)
                        // but @ the same time need to destroy the page
                        if (renderTaskRef.current) {
                            renderTaskRef.current.cancel();
                        }
                    case InternalState.CANVAS_DONE:
                        invariant(destroyFinished, `Invalid cleanup callback: ${stateDescription}`);
                        deleteCanvas(InternalState.CANVAS_NONE);
                        notifyRef.current = false;
                        console.log(`${pageNum}: Notifying destroy`)
                        destroyFinished(pageNum);
                }
                break;
            default:
                invariant(false, `invalid render state: ${state}`);
        }
    }, [state, viewport.width, viewport.height]);

    useEffect(() => {
        const { current: internal } = internalStateRef;
        if (canvasExists && internal === InternalState.CANVAS_RENDERING) {
            renderGraphics({
                canvasRef,
                viewport,
                renderFinished,
                renderTaskRef,
                pageNum,
                internalStateRef,
                outstandingRender,
                page: page!!,
            });
        }
        // TODO: Probably need to do viewport stuff for resize
    }, [canvasExists]);

    const styles = { ...style, width, height };
    return canvasExists
        ? (
            <div data-page={pageNum} className="shadow relative" style={styles}>
                <canvas ref={canvasRef} width={width} height={height} />
                {textInfo
                    ? (
                        <div
                            style={{ width, height }}
                            className="PageText"
                            dangerouslySetInnerHTML={{ __html: textInfo.html }}
                        >
                        </div>
                    )
                    : null}
            </div>
        )
        : (
            <div
                data-page={pageNum}
                // Tailwind CSS was not working for the background color
                style={{
                    background: `url(${gif})`,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundColor: "white",
                    ...styles,
                }}
                className="shadow"
            >
                {error ? "error" : ""}
            </div>
        );
}

// export default memo(Page);
export default Page;
