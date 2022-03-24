// TODO: Remove the invariants & just use if-stmts instead
import type { PDFPageProxy } from "pdfjs-dist";
import { RenderingCancelledException, renderTextLayer } from "pdfjs-dist";
import { RenderParameters, RenderTask, TextContent } from "pdfjs-dist/types/src/display/api";
import { PageViewport } from "pdfjs-dist/types/web/interfaces";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import invariant from "tiny-invariant";

const InternalState = {
    CANVAS_NONE: "canvas_none",
    CANVAS_RENDERING: "canvas_rendering",
    CANVAS_DONE: "canvas_done",
    ERROR: "error",
};
type InternalState = typeof InternalState[keyof typeof InternalState];

export const RenderState = {
    RENDER: "render",
    CANCEL: "cancel",
    DESTROY: "destroy",
    NONE: "none",
} as const;
export type RenderState = typeof RenderState[keyof typeof RenderState];

type PageProps = {
    state: RenderState;
    renderFinished?: (n: number) => void;
    cancelFinished?: (n: number) => void;
    destroyFinished?: (n: number) => void;
    page?: PDFPageProxy;
    pageNum: number;
    viewport: PageViewport;
    style?: CSSProperties;
    // TODO: remove
    // className?: string;
};

function Page(
    { state, page, pageNum, viewport, renderFinished, destroyFinished, cancelFinished, style = {} }: PageProps,
) {
    const [textInfo, setTextInfo] = useState<{ html: string } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<RenderTask | null>(null);
    // const renderTextTaskRef = useRef<TextLayerRenderTask | null>(null)
    const internalStateRef = useRef<InternalState>(InternalState.CANVAS_NONE);
    const cleanupRef = useRef<((n: number) => void) | undefined>(destroyFinished || cancelFinished);
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
                    // TODO: Is this a memory leak?
                    const rootElement = document.createElement("div");
                    rootElement.appendChild(frag);
                    const text = rootElement.innerHTML;
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
    }, [page, viewport.width, viewport.height]);

    useEffect(() => {
        const { current: internal } = internalStateRef;
        const assertInvalid = () => invariant(false, `invalid: ${stateDescription}`);

        console.log(`state change: ${stateDescription}`);

        switch (state) {
            case RenderState.NONE:
                switch (internal) {
                    case InternalState.CANVAS_DONE:
                    case InternalState.CANVAS_RENDERING:
                        assertInvalid();
                }
                break;
            case RenderState.CANCEL:
                switch (internal) {
                    case InternalState.CANVAS_NONE:
                        assertInvalid();
                    case InternalState.CANVAS_DONE:
                        invariant(cancelFinished, `Invalid cleanup callback: ${stateDescription}`);
                        console.log("RACE CONDITION ***");
                        // *Maybe* this could happen if
                        //  - Rendering starts
                        //  - Page manager issues cancel callback
                        //  - Race condition where we receive the cancel before we tell
                        //    the page manager we finished rendering
                        deleteCanvas(InternalState.CANVAS_NONE);
                        cancelFinished(pageNum);
                        break;
                    case InternalState.CANVAS_RENDERING:
                        const { current: renderTask } = renderTaskRef;
                        // Sometimes, we go from Rendering -> Cancel before
                        // the page even has a chance to *start* the render
                        if (renderTask) {
                            cleanupRef.current = cancelFinished;
                            renderTask.cancel();
                        } else {
                            internalStateRef.current = InternalState.CANVAS_NONE;
                            cancelFinished!!(pageNum);
                        }
                }
                break;
            case RenderState.RENDER:
                switch (internal) {
                    case InternalState.CANVAS_DONE:
                    case InternalState.CANVAS_RENDERING:
                        assertInvalid();
                    case InternalState.CANVAS_NONE:
                        internalStateRef.current = InternalState.CANVAS_RENDERING;
                        setCanvasExists(true);
                }
                break;
            case RenderState.DESTROY:
                switch (internal) {
                    case InternalState.CANVAS_NONE:
                    case InternalState.CANVAS_RENDERING:
                        assertInvalid();
                    case InternalState.CANVAS_DONE:
                        invariant(destroyFinished, `Invalid cleanup callback: ${stateDescription}`);
                        deleteCanvas(InternalState.CANVAS_NONE);
                        destroyFinished(pageNum);
                }
                break;
            default:
                invariant(false, `invalid render state: ${state}`);
        }
    }, [state]);

    useEffect(() => {
        const { current: internal } = internalStateRef;
        if (canvasExists && internal === InternalState.CANVAS_RENDERING) {
            console.log(`Start rendering: ${stateDescription}`);
            console.timeEnd("firstRender");

            const { current: canvas } = canvasRef;
            invariant(canvas, `no canvas even when canvasExists=${canvasExists}`);
            const ctx = canvas.getContext("2d");
            invariant(ctx, `invalid canvas context`);

            const renderArgs: RenderParameters = {
                canvasContext: ctx,
                viewport,
            };
            const task = page!!.render(renderArgs);
            renderTaskRef.current = task;
            task.promise
                .then(() => {
                    internalStateRef.current = InternalState.CANVAS_DONE;
                    renderTaskRef.current = null;
                    invariant(renderFinished, `no render callback when render finished`);
                    renderFinished(pageNum);
                })
                .catch((e: unknown) => {
                    console.log(`CANCELING: ${stateDescription}, ${(e as any).toString()}`);
                    renderTaskRef.current = null;
                    const isCancel = e instanceof RenderingCancelledException;
                    deleteCanvas(isCancel ? InternalState.CANVAS_NONE : InternalState.ERROR);
                    if (!isCancel) {
                        console.log(`Error rendering for page: ${pageNum}`);
                        console.error(e);
                        internalStateRef.current = InternalState.ERROR;
                        setError(true);
                    } else {
                        invariant(cleanupRef.current, `invalid cleanup`);
                        // If we don't use a ref then the closure doesn't capture the latest
                        // value of `cleanupFinished` leading to function is undefined errors
                        cleanupRef.current(pageNum);
                    }
                });
        }
        // TODO: Probably need to do viewport stuff for resize
    }, [canvasExists]);

    const styles = { ...style, width, height };
    console.log(textInfo);
    return canvasExists
        ? (
            <div className="shadow relative" style={styles}>
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
        : <div className="bg-black shadow" style={styles}>{error ? "error" : "Loading..."}</div>;
}

export default Page;
