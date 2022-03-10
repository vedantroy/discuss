import * as pdfjs from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import { PageViewport } from "pdfjs-dist/types/web/interfaces";
import { useEffect, useRef, useState } from "react";
import PageManager, { PageManagerOpts } from "./controller/PageManager";
import Page, { RenderState } from "./Page";
// TODO: check bundle size
import { fill, range } from "lodash";
import invariant from "tiny-invariant";
import useWindowDimensions from "./useWindowDimensions";

pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.min.js";

export default function Viewer({/*pageManagerConfig*/}: {
    // pageManagerConfig: PageManagerOpts;
}) {
    const { width, height } = useWindowDimensions();
    console.log(width, height);

    const [pageNumber, setPageNumber] = useState<number>(0);
    const { current: pages } = useRef<PDFPageProxy[]>([]);
    const pageManagerRef = useRef<PageManager | null>(null);
    const [pageStates, setPageStates] = useState<RenderState[]>([]);
    const pageViewportRef = useRef<PageViewport | null>(null);

    useEffect(() => {
        const initializePages = async () => {
            // TODO: We should display the 1st page as soon as it is loaded
            // Waiting for all pages to load takes ~ 0.5 seconds
            // for 432 page book, which is *very* noticeable
            console.time("load");
            const docTask = pdfjs.getDocument("/test2.pdf");
            const doc = await docTask.promise;

            const promises: Promise<void>[] = [];
            range(1, doc.numPages + 1)
                .forEach(pageNum => {
                    const getPage = async () => {
                        try {
                            const pageProxy = await doc.getPage(pageNum);
                            pages[pageNum - 1] = pageProxy;
                        } catch (e: unknown) {
                            throw `Failed to get page ${pageNum} with error: ${e}`;
                        }
                    };
                    promises.push(getPage());
                });
            await Promise.all(promises);

            console.timeEnd("load");
            pageViewportRef.current = pages[0].getViewport({
                scale: 1.0,
            });
            invariant(pages.length === doc.numPages, `incorrect # of page proxies: ${pages.length}`);

            const pm = new PageManager({
                pages: doc.numPages,
                basePageWidth: width,
                basePageHeight: height,
                hGap: 10,
                vGap: 10,
                pageBufferSize: 5,
                onX(x: number) {
                },
                onY(y: number) {
                },
                onPageNumber: setPageNumber,
                async onPageRender(n) {
                    const idx = n - 1;
                    // Can't set it outside this callback b/c
                    // `setState(...)` does not run sequentially
                    // Also must be set inside this `useEffect` b/c
                    // we need access to `doc.numPages`

                    console.log("INSIDE RENDER CALLBACK...")
                    console.log(pageStates)
                    console.log("DONE LOGGING")

                    const defaultPageStates = pageStates.length > 0
                        ? pageStates
                        : new Array(doc.numPages).fill(RenderState.NONE);

                    const newPageStates = [
                        ...defaultPageStates.slice(0, idx),
                        RenderState.RENDER,
                        ...defaultPageStates.slice(idx + 1),
                    ];
                    console.log("SETTING NEW PAGE STATES")
                    console.log(newPageStates)
                    setPageStates(newPageStates);
                },
                onPageCancel(n) {
                },
                onPageDestroy(n) {
                },
            });
            pageManagerRef.current = pm;
            pm.goToPage(1);
        };
        initializePages();
    }, []);

    const { current: pm } = pageManagerRef;
    if (!pm) return <div>Loading...</div>;

    console.log(pageStates.slice(0, 10))

    return (
        <div className="flex flex-col items-center w-screen">
            {pageStates.map((state, idx) => {
                // console.log(`state: ${state}, ${idx}, ${pages[idx]}`);
                return (
                    <Page
                        key={idx}
                        viewport={pageViewportRef.current!!}
                        pageNum={idx + 1}
                        width={100}
                        height={100}
                        page={pages[idx]}
                        state={state}
                        {...(state === RenderState.RENDER && { renderFinished: pm.renderFinished })}
                    />
                );
            })}
        </div>
    );
}
