// TODO: Remove the invariants & just use if-stmts instead
// TODO: Stop internal state from being a ref and just use useMemo
// TODO: Implement zoom & search ...
import type { PDFPageProxy } from "pdfjs-dist";
import { RenderingCancelledException, renderTextLayer } from "pdfjs-dist";
import { RenderParameters, RenderTask, TextContent } from "pdfjs-dist/types/src/display/api";
import { PageViewport } from "pdfjs-dist/types/web/interfaces";
import { memo } from "react";
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
    // TODO: remove
    // className?: string;
};

function Page(
    { state, page, pageNum, viewport, renderFinished, destroyFinished, style = {} }: PageProps,
) {
    const [textInfo, setTextInfo] = useState<{ html: string } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
    }, [page, viewport.width, viewport.height]);

    useEffect(() => {
        const { current: internal } = internalStateRef;
        const assertInvalid = () => invariant(false, `invalid: ${stateDescription}`);

        // console.log(`state change: ${stateDescription}`);

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
            console.time(`renderStart-${pageNum}`);
            task.promise
                .then(() => {
                    console.timeEnd(`renderStart-${pageNum}`);
                    internalStateRef.current = InternalState.CANVAS_DONE;
                    renderTaskRef.current = null;
                    invariant(renderFinished, `no render callback when render finished`);
                    renderFinished(pageNum);
                })
                .catch((e: unknown) => {
                    console.log(`Error rendering for page: ${pageNum}`);
                    console.error(e);
                    internalStateRef.current = InternalState.ERROR;
                    setError(true);
                });
        }
        // TODO: Probably need to do viewport stuff for resize
    }, [canvasExists]);

    const styles = { ...style, width, height };
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
        : (
            <div
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
