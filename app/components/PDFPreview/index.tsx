// TODO: Right now this component is debounced which is ugly
// We want throttle ...  (or a fundamental bug fix)
import type { PDFPageProxy, RenderTask } from "pdfjs-dist/types/src/display/api";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import invariant from "tiny-invariant";
import { Link } from "~/mod";
import debounceRender from "~/vendor/react-debounce-render";
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
    // const destCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [imgData, setImgData] = useState<string | null>(null);
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

    const firstRender = useRef(true);
    const prevSrcW = useRef({ w: srcW }).current;

    // The position of the sample in the source canvas
    const srcTop = scale(top);
    const srcLeft = scale(left);

    useEffect(() => {
        // const logGroupId = randIntBetween(0, 100);
        const { current: canvas } = sourceCanvasRef;
        if (!canvas) return;
        let cancel = false;

        const renderSource = prevSrcW.w !== srcW || firstRender.current;
        firstRender.current = false;
        prevSrcW.w = srcW;

        let task: RenderTask | null = null;
        async function go() {
            if (cancel) return;
            if (renderSource) {
                invariant(canvas, `invalid canvas`);
                // canvas.width = srcW;
                // canvas.height = srcH;
                const srcCtx = canvas.getContext("2d");
                invariant(srcCtx, `invalid canvas context`);
                invariant(canvas, `invalid canvas`);
                task = page.render({
                    viewport: vp,
                    canvasContext: srcCtx,
                });
                await task.promise;
            }
            if (cancel) return;

            const newRects = highlightRects.map(({ x, y, width, height }) => ({
                x: scale(x) - scale(left),
                y: scale(y) - scale(top),
                width: scale(width),
                height: scale(height),
            }));
            setRects(newRects);

            const buffer = document.createElement("canvas");
            const bufferCtx = buffer.getContext("2d");
            invariant(bufferCtx, `invalid canvas context`);
            buffer.width = containerWidth;
            buffer.height = destH;

            const subsectW = containerWidth;
            const subsectH = destH;

            const pDestW = containerWidth;
            const pDestH = destH;

            // console.log(
            //    `v2 src: ${srcW}x${srcH} subsect: ${subsectW}x${subsectH}, dest: ${pDestW}x${pDestH}`,
            // );

            bufferCtx.drawImage(
                canvas!!,
                // sx
                srcLeft,
                // sy
                srcTop,
                // sw -- always take the full width of the container
                subsectW,
                // sh
                subsectH,
                // dx
                0,
                // dy
                0,
                // dw (alt = destW)
                pDestW,
                // dh
                pDestH,
            );
            // don't think this does anything??
            if (cancel) return;
            setImgData(buffer.toDataURL());
            // setImgData(canvas!!.toDataURL());
        }
        go();

        return () => {
            cancel = true;
            task?.cancel();
        };
    }, [containerWidth, srcW]);

    return (
        <div className="relative">
            <Helmet>
                {/* drawImage is not great on Safari -https://stackoverflow.com/questions/35500999/cropping-with-drawimage-not-working-in-safari */}
                {/* https://gist.github.com/Kaiido/ca9c837382d89b9d0061e96181d1d862 */}
                <script src="/polyfill/safari_canvas_min.js"></script>
            </Helmet>
            <canvas hidden={true} ref={sourceCanvasRef} width={srcW} height={srcH} />
            {imgData && <img src={imgData} className="h-auto shadow" alt="" />}
            <div className="inset-0 absolute w-0 h-0">
                {rects ? <Highlight rects={rects} active={false} /> : null}
            </div>
        </div>
    );
}

const DebouncedPage = debounceRender(Page, 100);

export default function PreviewViewer(
    { url, page, className, pageRects, clickUrl }: PreviewViewProps,
) {
    const divRef = useRef<HTMLDivElement | null>(null);
    const { width, height } = useContainerDimensions(divRef);
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
                            <DebouncedPage
                                page={pageProxy}
                                containerWidth={width}
                                pageRects={pageRects}
                            />
                        </Link>
                    )
                    : (
                        <DebouncedPage
                            page={pageProxy}
                            containerWidth={width}
                            pageRects={pageRects}
                        />
                    ))
                : <div>loading ...</div>}
        </div>
    );
}
