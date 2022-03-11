// TODO: Remove the invariants & just use if-stmts instead
import type { PDFPageProxy } from "pdfjs-dist";
import { RenderParameters, RenderTask } from "pdfjs-dist/types/src/display/api";
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
    page: PDFPageProxy;
    pageNum: number;
    viewport: PageViewport;
    style?: CSSProperties;
    // TODO: remove
    // className?: string;
};

export default function Page(
    { state, page, pageNum, viewport, renderFinished, className = "", style = {} }: PageProps,
) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<RenderTask | null>(null);
    const internalStateRef = useRef<InternalState>(InternalState.CANVAS_NONE);
    const { width, height } = viewport;

    const [canvasExists, setCanvasExists] = useState(false);
    const [error, setError] = useState(false);

    function deleteCanvas() {
        setCanvasExists(false);
        const { current: canvas } = canvasRef;
        if (!canvas) {
            console.trace();
            invariant(false);
        }
        // PDF.js viewer states zeroing width/height
        // causes Firefox to release graphics resources immediately
        // reducing memory consumption
        canvas.width = 0;
        canvas.height = 0;
        setCanvasExists(false);
    }

    useEffect(() => {
        const { current: internal } = internalStateRef;
        const assertInvalid = () => invariant(false, `invalid internal state: ${internal} with render state: ${state}`);
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
                        // *Maybe* this could happen if
                        //  - Rendering starts
                        //  - Page manager issues cancel callback
                        //  - Race condition where we receive the cancel before we tell
                        //    the page manager we finished rendering
                        deleteCanvas();
                        break;
                    case InternalState.CANVAS_RENDERING:
                        const { current: renderTask } = renderTaskRef;
                        invariant(renderTask, `invalid render task: ${renderTask}`);
                        renderTask.cancel();
                        deleteCanvas();
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
                        deleteCanvas();
                }
                break;
            default:
                invariant(false, `invalid render state: ${state}`);
        }
    }, [state]);

    useEffect(() => {
        const { current: internal } = internalStateRef;
        if (canvasExists && internal === InternalState.CANVAS_RENDERING) {
            const { current: canvas } = canvasRef;
            invariant(canvas, `no canvas even when canvasExists=${canvasExists}`);
            const ctx = canvas.getContext("2d");
            invariant(ctx, `invalid canvas context`);

            const renderArgs: RenderParameters = {
                canvasContext: ctx,
                viewport,
            };
            const task = page.render(renderArgs);
            task.promise
                .then(() => {
                    renderTaskRef.current = null;
                    internalStateRef.current = InternalState.CANVAS_DONE;
                    invariant(renderFinished, `no render callback when render finished`);
                    console.log("calling render finished");
                    renderFinished(pageNum);
                })
                .catch((e: unknown) => {
                    if (e instanceof DOMException) {
                        console.log(`Error rendering for page: ${pageNum}`);
                        console.error(e);
                        setError(true);
                    } else if (e) {
                        console.log(`other exception ...`);
                        console.error(e);
                    }
                    renderTaskRef.current = null;
                    internalStateRef.current = InternalState.CANVAS_NONE;
                    deleteCanvas();
                });
        }
    }, [canvasExists]);

    const styles = { ...style, width, height };
    return canvasExists
        ? (
            <div className="shadow" style={styles}>
                <canvas ref={canvasRef} width={width} height={height} />
            </div>
        )
        : <div className="bg-white shadow" style={styles}>{error ? "error" : "Loading..."}</div>;
}
