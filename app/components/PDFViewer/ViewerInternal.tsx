import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import { PageViewport } from "pdfjs-dist/types/src/display/display_utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageManager, { makeRenderQueues } from "./controller/PageManager2";
import Page, { RenderState } from "./Page";
// TODO: check bundle size
import { debounce, fill, invert, range } from "lodash";
import invariant from "tiny-invariant";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
// pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.min.js";

// TODO: replace this params
const PAGE_BUFFER_SIZE = 3;

// This can't be a prop b/c
// we would need to call a method on the page manager to
// set the new v_gap (doable, just not now ...)
const V_GAP = 10;

type ViewerArgs = {
    // We can't do anything till we have the document ...
    doc: PDFDocumentProxy;
    firstPage: number;
    width: number;
    height: number;
};

const StartupState = {
    NO_PAGE_MANAGER: "no_page_manager",
    PAGE_MANAGER_LOADED: "page_manager_loaded",
    WENT_TO_FIRST_PAGE: "went_to_first_page",
} as const;
type StartupState = typeof StartupState[keyof typeof StartupState];

function isNum(x: unknown): x is number {
    return typeof x === "number";
}

export default function Viewer({ doc, firstPage, width, height }: ViewerArgs) {
    // TODO: Get this call out of here & into the parent
    const [allPagesLoaded, setAllPagesLoaded] = useState(false);
    const [startupState, setStartupState] = useState<StartupState>(StartupState.NO_PAGE_MANAGER);
    const [currentPage, setCurrentPage] = useState<number>(firstPage);
    const [pageStates, setPageStates] = useState<RenderState[]>(fill(new Array(doc.numPages), RenderState.NONE));

    const queuedScrollYRef = useRef<number | null>(null);
    const { current: pageToPromise } = useRef<Record<number, Promise<number>>>({});
    const { current: pages } = useRef<PDFPageProxy[]>([]);
    const pageViewportRef = useRef<PageViewport | null>(null);
    const pageManagerRef = useRef<PageManager | null>(null);
    const pageContainerRef = useRef<HTMLDivElement | null>(null);

    const { current: pm } = pageManagerRef;
    // fake is used for debug purposes
    const validPm = pm || { fake: true } as unknown as PageManager;
    validPm.onUpdate = useCallback(async ({ x, y, render, cancel, destroy, page, none }) => {
        if (isNum(page)) setCurrentPage(page);

        let copyChanged = false;
        const copy = [...pageStates];
        if (isNum(render)) {
            if (!allPagesLoaded) await pageToPromise[render - 1];
            copy[render - 1] = RenderState.RENDER;
            copyChanged = true;
        } else if (isNum(destroy)) {
            copy[destroy - 1] = RenderState.DESTROY;
            copyChanged = true;
        } else if (isNum(cancel)) {
            copy[cancel - 1] = RenderState.CANCEL;
            copyChanged = true;
        }

        if (isNum(y)) queuedScrollYRef.current = y;
        for (let i = 0; i < none.length; ++i) {
            copy[none[i] - 1] = RenderState.NONE;
            copyChanged = true;
        }

        if (copyChanged) console.log(copy);
        if (copyChanged) setPageStates(copy);
    }, [pageStates, allPagesLoaded]);

    // Seems like pageContainerRef changes several times
    // so we can't just one-and-done, set `scrollTop`
    // instead we continuously set it until the user scrolls
    // (at which point we nullify the value)
    if (pageContainerRef.current && queuedScrollYRef.current !== null) {
        const { current: pageContainer } = pageContainerRef;
        pageContainer.scrollTop = queuedScrollYRef.current;
    }

    if (pm && startupState === StartupState.PAGE_MANAGER_LOADED) {
        pm.goToPage(firstPage);
        setStartupState(StartupState.WENT_TO_FIRST_PAGE);
    }

    useEffect(() => {
        const initializePages = async () => {
            const renderQueues = makeRenderQueues(doc.numPages, PAGE_BUFFER_SIZE - 1);

            const firstRenderQueue = renderQueues[firstPage - 1];
            const firstRenderQueueSet = new Set();
            for (const page of firstRenderQueue) {
                firstRenderQueueSet.add(page);
            }

            async function getPage(pageNum: number) {
                try {
                    const pageProxy = await doc.getPage(pageNum);
                    pages[pageNum - 1] = pageProxy;
                } catch (e: unknown) {
                    throw `Failed to get page ${pageNum} with error: ${e}`;
                }
                return pageNum;
            }

            for (const page of firstRenderQueue) {
                pageToPromise[page] = getPage(page);
            }

            for (const page of range(1, doc.numPages + 1)) {
                if (!firstRenderQueueSet.has(page)) {
                    pageToPromise[page] = getPage(page);
                }
            }

            const promises = Object.values(pageToPromise);
            const firstPageLoadedNum = await Promise.race(promises);
            const firstPageLoaded = pages[firstPageLoadedNum - 1];
            const viewport = firstPageLoaded.getViewport({ scale: 1.0 });
            pageViewportRef.current = viewport;

            const pm = new PageManager({
                renderQueues,
                baseViewport: viewport,
                pages: doc.numPages,
                hGap: 10,
                vGap: V_GAP,
                pageBufferSize: PAGE_BUFFER_SIZE,
            });
            console.log("STARTING PAGE MANAGER");
            pm.start();
            pageManagerRef.current = pm;
            setStartupState(StartupState.PAGE_MANAGER_LOADED);

            await Promise.all(promises);
            setAllPagesLoaded(true);
        };
        initializePages();
    }, []);

    const Pages = useMemo(
        () => {
            // Pages are only displayed if the page manager exists ...
            if (!pm) return [];

            return pageStates.map((state, idx) => {
                const style = {
                    marginTop: V_GAP,
                    ...(idx === pageStates.length - 1 && { marginBottom: V_GAP }),
                };
                return (
                    <Page
                        style={style}
                        key={idx}
                        viewport={pageViewportRef.current!!}
                        pageNum={idx + 1}
                        page={pages[idx]}
                        state={state}
                        {...(state === RenderState.RENDER && {
                            renderFinished: pm.renderFinished,
                        })}
                        {...((state === RenderState.CANCEL) && {
                            cancelFinished: pm.cancelFinished,
                        })}
                        {...((state === RenderState.DESTROY) && {
                            destroyFinished: pm.destroyFinished,
                        })}
                    />
                );
            });
        },
        [pageStates],
    );

    return pm
        ? (
            <div
                style={{ height }}
                className="flex flex-col overflow-hidden bg-zinc-200"
            >
                <div className="h-8">current page: {currentPage}</div>
                <div
                    ref={pageContainerRef}
                    onScroll={e => {
                        const scroll = (e.target as HTMLDivElement).scrollTop;
                        queuedScrollYRef.current = null;
                        pm.setY(scroll);
                    }}
                    className="grid justify-center w-screen overflow-scroll"
                >
                    {Pages}
                </div>
            </div>
        )
        : <div>Loading..</div>;
}
