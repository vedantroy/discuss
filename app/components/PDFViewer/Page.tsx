// TODO: Remove the invariants & just use if-stmts instead
import * as pdfjs from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist";
import { RenderParameters, RenderTask } from "pdfjs-dist/types/src/display/api";
import { PageViewport } from "pdfjs-dist/types/web/interfaces";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";

// State machine:
// NO_CANVAS
//   render_request: start render
//   cancel_request: exception
//   destroy_request: exception
// RENDER_STARTED
//   render_request: exception
//   cancel_request: (run cancel) then start/finish destroy
//   destroy_request: exception
// RENDER_FINISHED
//   cancel_request:  exception
//   destroy_request: start/finish destroy
//   render_request:  exception

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
    width: number;
    height: number;
    page: PDFPageProxy;
    pageNum: number;
    viewport: PageViewport;
};

export default function Page({ state, width, height, page, pageNum, viewport, renderFinished }: PageProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<RenderTask | null>(null);
    const internalStateRef = useRef<InternalState>(InternalState.CANVAS_NONE);

    const [canvasExists, setCanvasExists] = useState(false);
    const [error, setError] = useState(false);

    function deleteCanvas() {
        setCanvasExists(false);
        const { current: canvas } = canvasRef;
        if (!canvas) {
            console.trace();
            invariant(false);
        }
        // invariant(canvas, `canvas`);
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

    return canvasExists
        ? (
            <div>
                <canvas ref={canvasRef} width={viewport.width} height={viewport.height} />
            </div>
        )
        : <div style={{ width: 100, height: 100 }}>{error ? "error" : "Loading..."}</div>;
}
