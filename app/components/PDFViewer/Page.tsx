// TODO: Remove the invariants & just use if-stmts instead
import type { PDFPageProxy } from "pdfjs-dist";
import { RenderParameters, RenderTask } from "pdfjs-dist/types/src/display/api";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";

export const RenderState = {
    RENDER: "render",
    CANCEL: "cancel",
    DESTROY: "destroy",
    NONE: "none",
} as const;
export type RenderState = typeof RenderState[keyof typeof RenderState];

type PageProps = {
    state: RenderState;
    width: number;
    height: number;
    page: PDFPageProxy;
};

export default function Page({ state, width, height, page }: PageProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<RenderTask | null>(null);
    const [renderCanvas, setRenderCanvas] = useState(false);

    function cleanupCanvas() {
        const { current: canvas } = canvasRef;
        invariant(canvas, `canvas`);
        // PDF.js viewer states zeroing width/height
        // causes Firefox to release graphics resources immediately
        // reducing memory consumption
        canvas.width = 0;
        canvas.height = 0;
        setRenderCanvas(false);
    }

    useEffect(() => {
        if (state !== RenderState.NONE) {
            console.log(state)
            invariant(page, `page`);
        }

        if (state === RenderState.RENDER) {
            console.log("RENDERING CANVAS: " + page)
            setRenderCanvas(true);
        } else if (state === RenderState.DESTROY) {
            invariant(!renderTaskRef.current, `!rtask`);
            cleanupCanvas();
        } else if (state === RenderState.CANCEL) {
            const { current: renderTask } = renderTaskRef;
            invariant(renderTask, `rtask`);
            renderTask.cancel();
        }
    }, [state]);

    useEffect(() => {
        if (state === RenderState.RENDER && canvasRef.current) {
            // The canvas was created *and* we want to render
            const { current: canvas } = canvasRef;
            const ctx = canvas.getContext("2d");
            invariant(ctx, `ctx`);
            const renderArgs: RenderParameters = {
                canvasContext: ctx,
                // @ts-ignore
                viewport: {},
            };
            const task = page.render(renderArgs);
            renderTaskRef.current = task;
            task.promise
                // We finished rendering ...
                .then(() => renderTaskRef.current = null)
                // We cancelled rendering or there was an unknown error
                .catch((e: unknown) => {
                    if (true) {
                        // assume it's a cancel for now
                        cleanupCanvas();
                    }
                });
        }
    }, [canvasRef.current]);

    return renderCanvas
        ? (
            <div>
                <canvas ref={canvasRef} width={100} height={100} />
            </div>
        )
        : <div style={{ width: 100, height: 100 }}>Loading ...</div>;
}
