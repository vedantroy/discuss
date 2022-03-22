// TODO: This code is fucked right now.. it just survives
// b/c I debounce inputs every 10ms, which is ... fine? ig? (for now)
// sad :( -- shoddy eng :///

import invariant from "tiny-invariant";
import { makeDoNotCallMe } from "../common/helpers";
// Ideally, this class would have no pdfjs imports b/c
// it would be divorced from the implementation details
// of pdfjs, but `PageViewport` is a handy layout class
import { clone } from "lodash";
import type { PageViewport } from "pdfjs-dist";

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

export function makeRenderQueues(pages: number, pageBufferSize: number): ReadonlyArray<ReadonlyArray<number>> {
    invariant(pageBufferSize % 2 === 0, `extra page buffer size was odd: ${pageBufferSize}`);
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

// TODO: Use conditional types
type PageUpdate =
    & (
        | { type?: "render" }
        | { type?: "destroy" }
        | { type?: "cancel" }
    )
    & { page?: number; none: number | null };

type Trace = Record<string, any>;

export type PageManagerOpts = {
    logInputs?: boolean;
    renderQueues: ReadonlyArray<ReadonlyArray<number>>;
    pages: number;
    baseViewport: PageViewport;

    hGap: number;
    vGap: number;

    // The page buffer are the pages that are not the current page
    // that are being rendered anyways
    pageBufferSize: number;

    onY?: (x: number) => void;
    onX?: (y: number) => void;
    onPageNumber?: (n: number) => void;

    // TODO: Test this ...
    onPageChange?: (updates: PageUpdate) => void;

    onPageRender?: (n: number) => void;
    onPageCancel?: (n: number) => void;
    onPageDestroy?: (n: number) => void;
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
    readonly #viewport: PageViewport;
    readonly #baseViewport: PageViewport;
    readonly #pageBufferSize: number;
    readonly renderQueues: ReadonlyArray<ReadonlyArray<number>>;

    #currentPage: number;
    #yUpdate: number;
    #xUpdate: number;

    #current: {
        render: number | null;
        destroy: number | null;
        cancel: number | null;
    };

    debugLog?: Array<any>;

    #renderQueueIdx: number;
    #rendered: Set<number>;

    #getLastFlush: (cur: FlushData) => typeof noPreviousArgument | FlushData;

    // These callbacks are public so tests are easier
    onPageChange: ((x: PageUpdate) => void | Promise<void>) & { wrapped?: true };

    onPageNumber: (n: number) => void;
    onX: (n: number) => void;
    onY: (n: number) => void;

    public renderFinished = (n: number) => {
        const trace = this.#makeTrace({ entry: "renderFinished", n });
        const { render } = this.#current;
        if (typeof n === "number") {
            if (n === this.#current.cancel && this.#current.render === null) {
                trace.bounced = true;
                return;
            }
            invariant(
                render === n,
                `expected outstanding render to be ${render} instead of ${n}`,
            );
        }
        // if (typeof n === "number") {
        // }
        invariant(!this.#rendered.has(render!!), `render set already had: ${render}`);
        this.#rendered.add(render!!);
        this.#current.render = null;
        this.#continueRender(null, trace);
    };

    #doOnPageRender(page: number, trace: Record<string, any>) {
        invariant(this.#current.render === null, `current render was: ${this.#current.render}`);
        this.#current.render = page;
    }

    public destroyFinished = (n: number) => {
        this.#rendered.delete(n);
        this.#cleanupHelper(n, "destroy");
    };

    #makeTrace({ entry, ...args }: Record<string, any>): Record<string, any> {
        if (this.debugLog) {
            const trace = { entry, ...args };
            this.debugLog.push(trace);
            return trace;
        }
        return {};
    }

    #cleanupHelper(n: number, type: "cancel" | "destroy") {
        const trace = this.#makeTrace({ entry: `${type}Finished`, n });
        const expected = this.#current[type];
        invariant(expected === n, `expected ${type} to be: ${expected} instead of ${n}`);
        this.#current[type] = null;
        this.#continueRender(n, trace);
    }

    #doOnPageDestroy(page: number) {
        const canDestroy = this.#current.destroy === null;
        if (canDestroy) {
            this.#current.destroy = page;
        }
        return canDestroy;
    }

    public cancelFinished = (n: number) => {
        this.#cleanupHelper(n, "cancel");
    };

    #doOnPageCancel() {
        const canCancel = !this.#current.cancel;
        if (canCancel) {
            invariant(this.#current.render !== null, `no existing render`);
            this.#current.cancel = this.#current.render;
            this.#current.render = null;
        }
        return canCancel;
    }

    constructor({
        pages,
        baseViewport,
        onPageChange,
        onPageNumber,
        vGap,
        hGap,
        onX,
        onY,
        pageBufferSize,
        renderQueues,
        logInputs,
    }: PageManagerOpts) {
        invariant(
            pageBufferSize % 2 === 1 && pageBufferSize > 0,
            `page buffer size must be positive & odd, got ${pageBufferSize}`,
        );

        this.debugLog = logInputs ? [] : undefined;
        this.renderQueues = renderQueues;
        this.#renderQueueIdx = -1;
        this.#rendered = new Set();
        this.#current = {
            render: null,
            destroy: null,
            cancel: null,
        };
        this.#currentPage = -1;

        this.#pages = pages;
        this.#baseViewport = baseViewport;
        this.#viewport = this.#baseViewport.clone();
        this.#vGap = vGap;
        this.#hGap = hGap;
        this.#getLastFlush = createLastValueHolder<FlushData>();
        this.#yUpdate = -1;
        this.#xUpdate = -1;
        this.#pageBufferSize = pageBufferSize;

        this.onPageChange = onPageChange || makeDoNotCallMe("onPageChange");
        this.onPageNumber = onPageNumber || makeDoNotCallMe("onPageNumber");
        this.onX = onX || makeDoNotCallMe("onX");
        this.onY = onY || makeDoNotCallMe("onY");
    }

    #resetRenderState() {
        this.#renderQueueIdx = 0;
    }

    public setY(y: number) {
        const trace = this.#makeTrace({ entry: this.setY.name, y });
        const height = this.height;
        invariant(0 <= y && y <= this.height, `${y} > ${height}`);

        const pageWithVGap = this.#pageHeight + this.#vGap;
        const pagesOutOfScreen = Math.floor(y / pageWithVGap);
        const remainingPixels = y % pageWithVGap;

        this.#currentPage = 1
            + pagesOutOfScreen
            + (remainingPixels > this.#vGap + this.#pageHeight / 2 ? 1 : 0);

        this.#flush(trace);
    }

    /** @param page starts from 1 */
    goToPage(page: number) {
        const trace = this.#makeTrace({ entry: this.goToPage.name, page });
        this.#invariantValidPage(page);

        // Example: If scroll to page 2 then we have scrolled by (2 - 1) pages and 2 vGaps
        const startOfPageTop = this.#pageHeight * (page - 1) + this.#vGap * page;
        // TODO: this hgap is broken, the pagemanager needs to take in total width
        const startOfPageLeft = this.#hGap;

        this.#yUpdate = startOfPageTop;
        this.#xUpdate = startOfPageLeft;
        this.#currentPage = page;

        this.#flush(trace);
    }

    #evictPage() {
        let toEvict = this.#current.render || null;
        let minPriority = this.#current.render ? getPriority(this.#currentPage, this.#current.render) : null;
        for (const page of this.#rendered) {
            const priority = getPriority(this.#currentPage, page);
            // Lower numbers = higher priority
            if (minPriority === null || minPriority < priority) {
                minPriority = priority;
                toEvict = page;
            }
        }

        invariant(toEvict !== null, `no page to evict from page buffer`);
        return toEvict;
    }

    #continueRender(none: number | null, trace: Record<string, any> = {}) {
        trace.none = none;
        trace.currentPage = this.#currentPage;
        trace.startCurrent = clone(this.#current);

        if (!this.onPageChange.wrapped) {
            this.onPageChange.wrapped = true;
            const og = this.onPageChange;
            this.onPageChange = (...args: Parameters<typeof this.onPageChange>) => {
                invariant(args.length === 1, `invalid args: ${JSON.stringify(args)}`);
                trace.args = args[0];
                trace.endCurrent = clone(this.#current);
                const { none, page } = args[0];
                if (none === page) args[0].none = null;
                // if (typeof args[0].none === "number") {
                //    invariant(args[0].none !== args[0].page, `page = none (${args[0].none})`);
                // }
                og(...args);
            };
        }

        const toRender = this.renderQueues[this.#currentPage - 1];
        while (this.#rendered.has(toRender[this.#renderQueueIdx]) && this.#renderQueueIdx < toRender.length) {
            this.#renderQueueIdx++;
        }

        // Case 1: We've rendered everything
        if (this.#renderQueueIdx === toRender.length) {
            if (none !== null) this.onPageChange({ none });
            else trace.noChange = true;
            return;
        }

        // Case 2: We can't render b/c there's no space
        const pageBufferFull = this.#rendered.size === this.#pageBufferSize;
        const pageBufferAlmostFull =
            (this.#rendered.size === this.#pageBufferSize - 1 && this.#current.render !== null);

        if (
            pageBufferFull || pageBufferAlmostFull
        ) {
            const toEvict = this.#evictPage();
            const type = toEvict === this.#current.render ? "cancel" : "destroy";
            let takeAction = false;
            if (toEvict === this.#current.render) {
                takeAction = this.#doOnPageCancel();
            } else {
                takeAction = this.#doOnPageDestroy(toEvict);
            }
            if (takeAction) {
                this.onPageChange({ type, page: toEvict, none });
            }
            trace.pageBufferFull = pageBufferFull;
            trace.pageBufferAlmostFull = pageBufferAlmostFull;
            return;
        }

        // Case 3: We can render but a page is already rendering
        // and it's lower priority than us. Cancel it.
        if (
            this.#current.render !== null && this.#renderQueueIdx < ALWAYS_RENDER
            && this.#renderQueueIdx - getPriority(this.#currentPage, this.#current.render) > PRIORITY_GAP
        ) {
            this.#doOnPageCancel();
            this.onPageChange({ type: "cancel", page: this.#current.render, none });
            return;
        }

        if (this.#current.render === null) {
            // Case 4: We can render and there's no page blocking our way ...
            const pageToRender = toRender[this.#renderQueueIdx];
            this.#doOnPageRender(pageToRender, trace);
            this.onPageChange({ type: "render", page: pageToRender, none });
        } else {
            trace.waitingForPage = this.#current.render;
        }
    }

    #flush(trace: Record<string, any> = {}) {
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
            this.#continueRender(null, trace);
        }

        if (flush.yUpdate !== -1 && (noPrev || flush.yUpdate !== prevFlush.yUpdate)) {
            this.onY(flush.yUpdate);
        }

        if (flush.xUpdate !== -1 && (noPrev || flush.xUpdate !== prevFlush.xUpdate)) {
            this.onX(flush.xUpdate);
        }
    }

    get #pageHeight() {
        return this.#viewport.height;
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

    #invariantValidPage(page: number) {
        invariant(1 <= page && page <= this.#pages, `Invalid page: ${page}`);
    }
}
