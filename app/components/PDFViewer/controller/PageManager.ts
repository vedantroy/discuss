import { AsyncIteratorManager } from "./AsyncIteratorManager";
import invariant from "tiny-invariant"

const ALWAYS_RENDER = 3;
const PRIORITY_GAP = 2;

function getPriority(currentPage: number, page: number) {
    return Math.abs(currentPage - page);
}

function rangeInclusive(a: number, b: number): number[] {
    const arr = [];
    for (let i = a; i <= b; ++i) arr.push(i);
    return arr;
}

function makeRenderQueues(pages: number, pageBufferSize: number): ReadonlyArray<ReadonlyArray<number>> {
    const queues: number[][] = Array(pages);
    for (let currentPage = 1; currentPage <= pages; ++currentPage) {
        const halfBuf = pageBufferSize / 2;

        let lo = Math.max(currentPage - halfBuf, 1);
        const loCapped = currentPage - lo < halfBuf;

        let hi = Math.min(currentPage + halfBuf, pages);
        const hiCapped = hi - currentPage < halfBuf;

        if (loCapped !== hiCapped) {
            if (loCapped) hi = Math.min(lo + pageBufferSize, pages);
            if (hiCapped) lo = Math.max(hi - pageBufferSize, 1);
        }

        const queue = rangeInclusive(lo, hi);
        queue.sort((a, b) => getPriority(currentPage, a) - getPriority(currentPage, b));

        queues[currentPage - 1] = queue;
    }
    return queues;
}

// Get the 1st version done -- design decisions can be made later
// you don't understand what matters itll it's deployed
export type PageManagerOpts = {
    pages: number;
    basePageWidth: number;
    basePageHeight: number;

    hGap: number;
    vGap: number;

    // The page buffer are the pages that are not the current page
    // that are being rendered anyways
    pageBufferSize: number;

    onY: (x: number) => void;
    onX: (y: number) => void;
    onPageNumber: (n: number) => void;
    onPageRender: (n: number) => void;
    onPageCancel: (n: number) => void;
    onPageDestroy: (n: number) => void;
};

const noPreviousArgument = Symbol();

type FlushData = {
    currentPage: number;
    yUpdate: number;
    xUpdate: number;
};

function createLastValueHolder<T>(): (cur: T) => typeof noPreviousArgument | T {
    let prev: typeof noPreviousArgument | T = noPreviousArgument;
    return (cur: T) => {
        const oldPrev = prev;
        prev = cur;
        return oldPrev;
    };
}

export default class PageManager {
    readonly #pages: number;
    readonly #hGap: number;
    readonly #vGap: number;
    readonly #basePageWidth: number;
    readonly #basePageHeight: number;
    readonly #pageWidth: number;
    readonly #pageHeight: number;
    readonly #pageBufferSize: number;
    readonly renderQueues: ReadonlyArray<ReadonlyArray<number>>;

    #currentPage: number;
    #yUpdate: number;
    #xUpdate: number;

    #currentRender: number | null;

    // For testing -- but no harm exposing the value as a getter
    get currentRender() {
        return this.#currentRender;
    }

    // Also for testing
    get rendered() {
        const copy = new Set();
        for (const x of this.#rendered) {
            copy.add(x);
        }
        return copy;
    }

    #renderQueueIdx: number;
    #rendered: Set<number>;

    #getLastFlush: (cur: FlushData) => typeof noPreviousArgument | FlushData;

    // Async iterators are pull-based
    // Call-backs are push based
    // Application-code can use either w/o issue
    // But tests are better written pull-based
    // So we supply an async iterator interface for some of the harder to test functions
    #onPageRenderIteratorManager: AsyncIteratorManager;
    #onPageDestroyIteratorManager: AsyncIteratorManager;
    #onPageCancelIteratorManager: AsyncIteratorManager;

    // These callbacks are public so tests are easier
    onPageNumber: (n: number) => void;
    onPageRender: (n: number) => void | Promise<void>;
    onPageDestroy: (n: number) => void;
    onPageCancel: (n: number) => void;
    onX: (n: number) => void;
    onY: (n: number) => void;

    createOnPageRenderIterator(n: number | null = null): AsyncIterable<number> {
        return this.#onPageRenderIteratorManager.createIterable(n);
    }

    createOnPageDestroyIterator(n: number | null = null): AsyncIterable<number> {
        return this.#onPageDestroyIteratorManager.createIterable(n);
    }

    createOnPageCancelIterator(n: number | null = null): AsyncIterable<number> {
        return this.#onPageCancelIteratorManager.createIterable(n);
    }

    #doOnPageRender(page: number) {
        invariant(this.#currentRender === null, `current render was: ${this.#currentRender}`);
        this.#currentRender = page;
        this.#ensureRenderSpace();
        this.#onPageRenderIteratorManager.pushValue(page);
        this.onPageRender(page);
    }

    #doOnPageDestroy(page: number) {
        this.#onPageDestroyIteratorManager.pushValue(page);
        this.onPageDestroy(page);
    }

    // Technically the arg isn't necessary
    // since the consumer can keep-track of the current
    // render, but the information makes life easier
    #doOnPageCancel(page: number) {
        this.#onPageCancelIteratorManager.pushValue(page);
        this.#currentRender = null;
        this.onPageCancel(page);
    }

    constructor({
        pages,
        basePageHeight,
        basePageWidth,
        onPageNumber,
        vGap,
        hGap,
        onPageRender,
        onPageDestroy,
        onPageCancel,
        onX,
        onY,
        pageBufferSize,
    }: PageManagerOpts) {
        invariant(
            pageBufferSize % 2 === 1 && pageBufferSize > 0,
            `page buffer size must be positive & odd, got ${pageBufferSize}`,
        );

        this.renderQueues = makeRenderQueues(pages, pageBufferSize - 1);
        this.#renderQueueIdx = -1;
        this.#rendered = new Set();
        this.#currentRender = null;
        this.#currentPage = -1;

        this.#pages = pages;
        this.#basePageHeight = basePageHeight;
        this.#pageHeight = basePageHeight;
        this.#basePageWidth = basePageWidth;
        this.#pageWidth = basePageWidth;
        this.#vGap = vGap;
        this.#hGap = hGap;
        this.#getLastFlush = createLastValueHolder<FlushData>();
        this.#yUpdate = -1;
        this.#xUpdate = -1;
        this.#pageBufferSize = pageBufferSize;

        this.onPageCancel = onPageCancel;
        this.onPageNumber = onPageNumber;
        this.onPageRender = onPageRender;
        this.onPageDestroy = onPageDestroy;
        this.onX = onX;
        this.onY = onY;

        this.#onPageRenderIteratorManager = new AsyncIteratorManager();
        this.#onPageDestroyIteratorManager = new AsyncIteratorManager();
        this.#onPageCancelIteratorManager = new AsyncIteratorManager();
    }

    #resetRenderState() {
        this.#renderQueueIdx = 0;
    }

    public renderFinished = (n?: number) => {
        invariant(typeof this.#currentRender === "number", `invalid current render: ${this.#currentRender}`);
        invariant(!this.#rendered.has(this.#currentRender!!), `render set already had: ${this.#currentRender}`);
        if (typeof n === 'number') {
            invariant(this.#currentRender === n, `expected outstanding render to be ${this.#currentRender} instead of ${n}`)
        }
        this.#rendered.add(this.#currentRender);
        this.#currentRender = null;
        this.#continueRender();
    };

    // Eviction is O(N)
    // This seems fine (not worth questionably micro-optimizing with a heap)
    #ensureRenderSpace(): boolean {
        const isFull = this.#rendered.size === this.#pageBufferSize;
        if (isFull) {
            let toEvict = null;
            let minPriority = null;
            for (const page of this.#rendered) {
                const priority = getPriority(this.#currentPage, page);
                // Lower numbers = higher priority
                if (minPriority === null || minPriority < priority) {
                    minPriority = priority;
                    toEvict = page;
                }
            }
            this.#rendered.delete(toEvict!!);
            this.#doOnPageDestroy(toEvict!!);
        }
        return isFull;
    }

    #continueRender(): boolean {
        const toRender = this.renderQueues[this.#currentPage - 1];
        while (this.#rendered.has(toRender[this.#renderQueueIdx]) && this.#renderQueueIdx < toRender.length) {
            this.#renderQueueIdx++;
        }

        // Case 1: We've rendered everything
        if (this.#renderQueueIdx === toRender.length) return false;

        const maybeRender = toRender[this.#renderQueueIdx];
        if (this.#currentRender === null) {
            // Case 2: No page is rendering, render ours
            this.#doOnPageRender(maybeRender);
            return true;
        } else if (
            this.#renderQueueIdx < ALWAYS_RENDER
            || this.#renderQueueIdx - getPriority(this.#currentPage, this.#currentRender) > PRIORITY_GAP
        ) {
            // Case 3: We cancel the currently rendering page and render ours instead
            this.#doOnPageCancel(this.#currentRender);
            this.#doOnPageRender(maybeRender);
            return true;
        }
        return false;
    }

    #flush() {
        const flush = {
            currentPage: this.#currentPage,
            yUpdate: this.#yUpdate,
            xUpdate: this.#xUpdate,
        };

        const prevFlush = this.#getLastFlush(flush);
        const noPrev = prevFlush === noPreviousArgument;
        const newPage = noPrev || prevFlush.currentPage !== flush.currentPage;

        if (noPrev || newPage) {
            this.onPageNumber(flush.currentPage);
            this.#resetRenderState();
            this.#continueRender();
        }

        if (flush.yUpdate !== -1 && (noPrev || flush.yUpdate !== prevFlush.yUpdate)) {
            this.onY(flush.yUpdate);
        }

        if (flush.xUpdate !== -1 && (noPrev || flush.xUpdate !== prevFlush.xUpdate)) {
            this.onX(flush.xUpdate);
        }
    }

    get height() {
        // For 2 pages (represented horizontally), we have:
        // vgap
        // PAGE 1
        // vgap
        // PAGE 2
        // vgap
        return this.#pages * (this.#pageHeight + this.#vGap) + this.#vGap;
    }

    public setY(y: number) {
        const height = this.height;
        invariant(0 <= y && y <= this.height, `${y} > ${height}`);

        const pageWithVGap = this.#pageHeight + this.#vGap;
        const pagesOutOfScreen = Math.floor(y / pageWithVGap);
        const remainingPixels = y % pageWithVGap;

        this.#currentPage = 1
            + pagesOutOfScreen
            + (remainingPixels > this.#vGap + this.#pageHeight / 2 ? 1 : 0);

        this.#flush();
    }

    #invariantValidPage(page: number) {
        invariant(1 <= page && page <= this.#pages, `Invalid page: ${page}`);
    }

    /** @param page starts from 1 */
    goToPage(page: number) {
        this.#invariantValidPage(page);

        // Example: If scroll to page 2 then we have scrolled by (2 - 1) pages and 2 vGaps
        const startOfPageTop = this.#pageHeight * (page - 1) + this.#vGap * page;
        const startOfPageLeft = this.#hGap;

        this.#yUpdate = startOfPageTop;
        this.#xUpdate = startOfPageLeft;
        this.#currentPage = page;

        this.#flush();
    }
}
