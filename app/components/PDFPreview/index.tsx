import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import { useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { Link } from "~/mod";
import Highlight from "../PDFWindow/PDFViewer/display/Highlight";
import { Rect } from "../PDFWindow/types";
import useContainerDimensions from "./useContainerDimensions";
import usePDFDoc from "./usePDFDoc";

type PageRects = {
    outline: Rect;
    rects: Rect[];
};

type PreviewViewProps = {
    className: string;
    url: string;
    pageRects: PageRects;
    page: number;
    clickUrl?: string;
};

type PageProps = {
    containerWidth: number;
    page: PDFPageProxy;
    pageRects: PageRects;
    clickUrl?: string;
};

// There's some post MVP stuff I need to do here where resizing back down
// does not cause the canvas to re-shrink but that's beyond current scope
function Page({ pageRects, page, containerWidth }: PageProps) {
    const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const destCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const [rects, setRects] = useState<Rect[] | null>(null);

    const { outline, rects: highlightRects } = pageRects;
    // const { width: sampleW, height: sampleH, rects: highlightRects, top, left } = ctx;

    const { width: sampleW, height: sampleH, x: left, y: top } = outline;

    // The width of the excerpt is given @ 1x scale
    // If the excerpt is rendered @ 5px & the container width is 10px
    // We need to render the page @ 2x zoom, so the excerpt will have 10px width
    const scaleMultiplier = Math.min(containerWidth / sampleW, 2);
    const scale = (x: number) => x * scaleMultiplier;
    const destW = scale(sampleW);
    const destH = scale(sampleH);

    const vp = page.getViewport({ scale: scaleMultiplier });
    const { width: srcW, height: srcH } = vp;

    // The position of the sample in the source canvas
    const srcTop = scale(top);
    const srcLeft = scale(left);

    useEffect(() => {
        if (sourceCanvasRef) {
            let cancel = false;
            console.log("rendering canvas ...");

            const { current: canvas } = sourceCanvasRef;
            invariant(canvas, `invalid canvas`);
            const ctx = canvas.getContext("2d");
            invariant(ctx, `invalid canvas context`);
            const task = page.render({
                viewport: vp,
                canvasContext: ctx,
            });
            const go = async () => {
                await task.promise;
                if (cancel) return;

                const newRects = highlightRects.map(({ x, y, width, height }) => ({
                    x: scale(x) - scale(left),
                    y: scale(y) - scale(top),
                    width: scale(width),
                    height: scale(height),
                }));

                setRects(newRects);

                const { current } = destCanvasRef;
                const ctx = current!!.getContext("2d");
                ctx!!.drawImage(
                    canvas,
                    // sx
                    srcLeft,
                    // sy
                    srcTop,
                    // sw -- always take the full width of the container
                    containerWidth,
                    // sh
                    destH,
                    // dx
                    0,
                    // dy
                    0,
                    // dw
                    containerWidth,
                    // destW,
                    // dh
                    destH,
                );
            };
            go();

            return () => {
                cancel = true;
                task.cancel();
            };
        }
    }, [containerWidth]);

    return (
        <div className="relative">
            <canvas hidden={true} ref={sourceCanvasRef} width={srcW} height={srcH} />
            <div
                className={`shadow`}
                style={{ width: destW, height: destH }}
            >
                <canvas
                    ref={destCanvasRef}
                    width={containerWidth}
                    height={destH}
                />
            </div>
            <div className="inset-0 absolute w-0 h-0">
                {rects ? <Highlight rects={rects} active={false} /> : null}
            </div>
        </div>
    );
}

export default function PreviewViewer(
    { url, page, className, pageRects, clickUrl }: PreviewViewProps,
) {
    const divRef = useRef<HTMLDivElement | null>(null);
    const { width, height } = useContainerDimensions(divRef);
    console.log("PREVIEW GETTING PAGE AT: " + url);
    const doc = usePDFDoc(url);
    const [pageProxy, setPageProxy] = useState<PDFPageProxy | null>(null);

    useEffect(() => {
        if (doc) {
            async function go() {
                const pageProxy = await doc!!.getPage(page);
                setPageProxy(pageProxy);
            }
            go();
        }
    }, [doc]);

    return (
        <div className={className} ref={divRef}>
            {((width !== 0 && height !== 0) && pageProxy)
                ? (clickUrl
                    ? (
                        <Link prefetch="render" target="_blank" to={clickUrl}>
                            <Page
                                page={pageProxy}
                                containerWidth={width}
                                pageRects={pageRects}
                            />
                        </Link>
                    )
                    : (
                        <Page
                            page={pageProxy}
                            containerWidth={width}
                            pageRects={pageRects}
                        />
                    ))
                : <div>loading ...</div>}
        </div>
    );
}
