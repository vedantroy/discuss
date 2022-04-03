import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy, TextContent } from "pdfjs-dist/types/src/display/api";
import { PageViewport } from "pdfjs-dist/types/src/display/display_utils";
import { KeyboardEventHandler, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageManager, { makeRenderQueues, PageState } from "../controller/PageManager";
import Page, { RenderState } from "./Page";

// TODO: check bundle size
import { clamp, fill, range } from "lodash";
import invariant from "tiny-invariant";
import { PostHighlight } from "../../types";
import { processSelection, SelectionContext } from "./selection";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

// TODO: replace this params
const PAGE_BUFFER_SIZE = 5;
const MAX_SCALE_FACTOR = 4;

const NAV_KEYS = new Set(["ArrowLeft", "ArrowRight", "Delete", "Backspace"]);

// This can't be a prop b/c
// we would need to call a method on the page manager to
// set the new v_gap (doable, just not now ...)
const V_GAP = 10;

type ViewerProps = {
    // We can't do anything till we have the document ...
    doc: PDFDocumentProxy;
    firstPage: number;
    width: number;
    height: number;
    highlights: PostHighlight[];

    onSelection: (ctx: SelectionContext | null) => void;
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

function Viewer({ doc, firstPage, width, height, onSelection, highlights }: ViewerProps) {
    const forceUpdate: () => void = useState()[1].bind(null, {} as any);

    // TODO: Get this call out of here & into the parent
    const [allPagesLoaded, setAllPagesLoaded] = useState(false);
    const [startupState, setStartupState] = useState<StartupState>(StartupState.NO_PAGE_MANAGER);
    const [pageStates, setPageStates] = useState<RenderState[]>(fill(new Array(doc.numPages), RenderState.NONE));

    const pageInputRef = useRef<HTMLInputElement>(null);
    const zoomRef = useRef<number>(1.0);

    const queuedScrollYRef = useRef<number | null>(null);
    const { current: pageToPromise } = useRef<Record<number, Promise<number>>>({});
    // We don't store text content here (although that would make design simpler)
    // B/c getting text content can take 600 ms ... which is too high for 1st load
    const { current: pages } = useRef<Array<{ proxy: PDFPageProxy } | undefined>>(
        fill(new Array(doc.numPages), undefined),
    );
    const [outstandingRender, setOutstandingRender] = useState<number | null>(null);
    const [viewport, setViewport] = useState<PageViewport | null>(null);
    const pageManagerRef = useRef<PageManager | null>(null);
    const pageContainerRef = useRef<HTMLDivElement | null>(null);

    const { current: pm } = pageManagerRef;
    // fake is used for debug purposes
    const validPm = pm || { fake: true } as unknown as PageManager;
    validPm.onUpdate = useCallback(async ({ x, y, states, page, viewport, outstandingRender }) => {
        if (!allPagesLoaded && states) {
            const idxs = states
                .map((x, i) => x === PageState.RENDER ? i : null)
                .filter(x => x !== null) as number[];

            for (const idx of idxs) {
                // TODO: If we ever hit this, we'll deal w/ it
                invariant(pages[idx], `still loading page: ${idx + 1}`);
            }
        }
        if (outstandingRender !== undefined) setOutstandingRender(outstandingRender);
        if (isNum(page)) {
            pageInputRef.current!!.value = page.toString();
        }

        if (isNum(y)) {
            queuedScrollYRef.current = y;
            forceUpdate();
        }
        if (viewport) setViewport(viewport);
        if (Array.isArray(states)) {
            setPageStates(states.map(x => x === PageState.RENDER_DONE ? RenderState.RENDER : x));
        }
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
                    pages[pageNum - 1] = { proxy: pageProxy };
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
            const viewport = firstPageLoaded!!.proxy.getViewport({ scale: zoomRef.current!! });
            setViewport(viewport);

            const pm = new PageManager({
                renderQueues,
                baseViewport: viewport,
                pages: doc.numPages,
                hGap: 10,
                vGap: V_GAP,
                pageBufferSize: PAGE_BUFFER_SIZE,
            });
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
                        highlights={highlights}
                        style={style}
                        key={idx}
                        viewport={viewport!!}
                        pageNum={idx + 1}
                        outstandingRender={outstandingRender}
                        page={pages[idx]?.proxy}
                        state={state}
                        {...(state === RenderState.RENDER && {
                            renderFinished: pm.renderFinished,
                        })}
                        {...((state === RenderState.DESTROY) && {
                            destroyFinished: pm.destroyFinished,
                        })}
                    />
                );
            });
        },
        [pageStates, viewport, outstandingRender],
    );

    const maxDigits = doc.numPages.toString().length;

    const goToPageFromInput = useCallback(() => {
        const text = pageInputRef.current?.value || "";
        const i = parseInt(text === "" ? "1" : text);
        invariant(isFinite(i), `invalid input: ${text}`);
        pm!!.goToPage(clamp(i, 1, doc.numPages));
    }, [pageInputRef?.current, pm, doc.numPages]);

    return pm
        ? (
            <div
                onMouseUp={() => {
                    const ctx = processSelection(document.getSelection());
                    onSelection(ctx);
                }}
                style={{ height }}
                className="flex flex-col overflow-hidden bg-zinc-400"
            >
                <div
                    // TODO: Why do we have to use min-height?
                    className="flex flex-row shadow shadow-zinc-700 bg-zinc-600 min-h-[2rem] items-center text-zinc-200 text-base"
                    style={{ zIndex: 2 }}
                >
                    <input
                        ref={pageInputRef}
                        onKeyDown={evt => {
                            if (evt.ctrlKey || NAV_KEYS.has(evt.key)) return;
                            if (evt.key === "Enter") {
                                goToPageFromInput();
                                return;
                            }
                            // only allow numbers
                            if (!isFinite(parseInt(evt.key)) || evt.key === " ") {
                                evt.preventDefault();
                            }
                        }}
                        onBlur={() => goToPageFromInput()}
                        className="border-none outline-none bg-zinc-700 mr-1 ml-2 text-center"
                        style={{ width: `calc(max(2, ${maxDigits}) * 1ch + 8px)` }}
                    >
                    </input>
                    <div>/ {doc.numPages}</div>
                    <button
                        onClick={() => {
                            zoomRef.current -= 0.1;
                            pm.setZoom(zoomRef.current);
                        }}
                    >
                        - zoom
                    </button>
                    <button
                        onClick={() => {
                            zoomRef.current += 0.1;
                            pm.setZoom(zoomRef.current);
                        }}
                    >
                        + zoom
                    </button>
                </div>
                <div
                    ref={pageContainerRef}
                    onScroll={e => {
                        const scroll = (e.target as HTMLDivElement).scrollTop;
                        queuedScrollYRef.current = null;
                        pm.setY(scroll);
                    }}
                    className="grid justify-center w-screen overflow-auto"
                >
                    {Pages}
                </div>
            </div>
        )
        : <div>Loading..</div>;
}

export default memo(Viewer);
