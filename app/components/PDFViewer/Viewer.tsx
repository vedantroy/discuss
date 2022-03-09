import * as pdfjs from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import { useEffect, useRef, useState } from "react";
import PageManager, { PageManagerOpts } from "./controller/PageManager";
import Page, { RenderState } from "./Page";
// TODO: check bundle size
import { fill, range } from "lodash";

pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.min.js";

export default function Viewer({/*pageManagerConfig*/}: {
    // pageManagerConfig: PageManagerOpts;
}) {
    const [pageNumber, setPageNumber] = useState<number>(0);
    const { current: pages } = useRef<PDFPageProxy[]>([]);
    const [pageStates, setPageStates] = useState<RenderState[]>([]);

    useEffect(() => {
        const initializePages = async () => {
            // TODO: We should display the 1st page as soon as it is loaded
            // Waiting for all pages to load takes ~ 0.5 seconds
            // for 432 page book, which is *very* noticeable
            console.time("load");
            const docTask = pdfjs.getDocument("/test2.pdf");
            const doc = await docTask.promise;
            setPageStates(new Array(doc.numPages).fill(RenderState.NONE));

            const promises: Promise<void>[] = [];
            range(1, doc.numPages + 1)
                .forEach(pageNum => {
                    const getPage = async () => {
                        doc.getPage(pageNum)
                            .then(pageProxy => pages[pageNum - 1] = pageProxy)
                            .catch(e => {
                                throw `Failed to get page ${pageNum} with error: ${e}`;
                            });
                    };
                    promises.push(getPage());
                });
            await Promise.all(promises);
            console.timeEnd("load");

            const pm = new PageManager({
                pages: doc.numPages,
                basePageWidth: 100,
                basePageHeight: 100,
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
                    const newPageStates = [
                        ...pageStates.slice(0, idx),
                        RenderState.RENDER,
                        ...pageStates.slice(idx + 1),
                    ];
                    console.log("SETTING RENDER[] ...")
                    setPageStates(newPageStates);
                },
                onPageCancel(n) {
                },
                onPageDestroy(n) {
                },
            });
            pm.goToPage(1)
        };
        initializePages();
    }, []);

    console.log(pageStates)

    if (pageStates.length === 0) return <div>Loading...</div>;
    return (
        <div>
            {pageStates.map((state, idx) => (
                <Page
                    key={idx}
                    width={100}
                    height={100}
                    page={pages[idx]}
                    state={state}
                />
            ))}
        </div>
    );
}
