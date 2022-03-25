import { fill } from "lodash";
import { PageViewport } from "pdfjs-dist";
import invariant from "tiny-invariant";
import { makeDoNotCallMe } from "./helpers";

const EventType = {
    GO_TO_PAGE: "go_to_page",
    SET_Y: "set_y",
    RESIZE: "resize",
    RENDER_FINISHED: "render_finished",
    DESTROY_FINISHED: "destroy_finished",
} as const;
type EventType = typeof EventType[keyof typeof EventType];

type Event =
    | { type: (typeof EventType.SET_Y); y: number }
    | { type: (typeof EventType.GO_TO_PAGE); page: number }
    | ({
        type: (typeof EventType.RENDER_FINISHED | typeof EventType.DESTROY_FINISHED);
    } & { page: number });

// This enum should be kept in sync w/ the stuff in Page.tsx
export const PageState = {
    NONE: "none",
    RENDER: "render",
    RENDER_DONE: "rendered",
    DESTROY: "destroy",
} as const;
export type PageState = typeof PageState[keyof typeof PageState];

const InternalType = {
    DONE: "done",
    BLOCKED_SELF: "blocked_self",
    BLOCKED_OTHER: "blocked_other",
    RENDER: "render",
    DESTROY: "destroy",
} as const;
type InternalType = typeof InternalType[keyof typeof InternalType];

export type PageManagerOpts = {
    pageBufferSize: number;
    renderQueues: ReadonlyArray<ReadonlyArray<number>>;
    pages: number;
    baseViewport: PageViewport;

    hGap: number;
    vGap: number;
};

type PartialUpdate = Omit<Update, "states">;
type Update = {
    x?: number;
    y?: number;
    states?: PageState[];
    page?: number;
};

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

export default class PageManager {
    #running: boolean;
    #events: Array<Event>;

    readonly #baseViewport: PageViewport;
    readonly #viewport: PageViewport;
    readonly #hGap: number;
    readonly #vGap: number;
    readonly #pages: number;
    readonly renderQueues: ReadonlyArray<ReadonlyArray<number>>;
    readonly #pageBufferSize: number;

    #outstandingRender: number | null;
    #states: PageState[];
    #rendered: Set<number>;
    #renderQueueIdx: number;
    #currentPage: number;
    #update: PartialUpdate | null;
    onUpdate: (u: Update) => void;

    constructor({ renderQueues, pageBufferSize, hGap, vGap, baseViewport, pages }: PageManagerOpts) {
        invariant(
            pageBufferSize % 2 === 1 && pageBufferSize > 0,
            `page buffer size must be positive & odd, got ${pageBufferSize}`,
        );
        this.#events = [];
        this.#running = false;
        this.#renderQueueIdx = -1;
        this.#currentPage = -1;
        this.renderQueues = renderQueues;
        this.#outstandingRender = null;
        this.#pageBufferSize = pageBufferSize;
        this.#update = null;
        this.#rendered = new Set();
        this.#vGap = vGap;
        this.#hGap = hGap;
        this.#baseViewport = baseViewport;
        this.#viewport = baseViewport;
        this.#pages = pages;
        this.#states = fill(new Array(pages), PageState.NONE);
        this.onUpdate = makeDoNotCallMe("onUpdate");
    }

    #evictPage() {
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
        invariant(toEvict !== null, `no page to evict from page buffer`);
        return toEvict;
    }

    #continueRender(): { action: InternalType; page?: number } {
        const toRender = this.renderQueues[this.#currentPage - 1];
        while (this.#rendered.has(toRender[this.#renderQueueIdx]) && this.#renderQueueIdx < toRender.length) {
            this.#renderQueueIdx++;
        }

        // Case 1: We've rendered everything
        if (this.#renderQueueIdx === toRender.length) {
            return { action: InternalType.DONE };
        }

        const pageToRender = toRender[this.#renderQueueIdx];
        if (pageToRender === this.#outstandingRender) {
            return { action: InternalType.BLOCKED_SELF, page: this.#outstandingRender };
        }

        const pageBufferFull = this.#rendered.size === this.#pageBufferSize;
        const pageBufferAlmostFull =
            (this.#rendered.size === this.#pageBufferSize - 1 && this.#outstandingRender !== null);

        if (pageBufferFull || pageBufferAlmostFull) {
            // Case 2: We can't render b/c there's no space
            const toEvict = this.#evictPage();
            return {
                action: InternalType.DESTROY,
                page: toEvict,
            };
        }

        return this.#outstandingRender === null
            ? { action: InternalType.RENDER, page: pageToRender }
            : { action: InternalType.BLOCKED_OTHER, page: this.#outstandingRender };
    }

    get #pageHeight() {
        return this.#viewport.height;
    }

    #goToPage(page: number) {
        // Example: If scroll to page 2 then we have scrolled by (2 - 1) pages and 2 vGaps
        const startOfPageTop = this.#pageHeight * (page - 1) + this.#vGap * page;
        // TODO: this hgap is broken, the pagemanager needs to take in total width
        const startOfPageLeft = this.#hGap;

        return { x: startOfPageLeft, y: startOfPageTop };
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

    #assertValidPage(page: number) {
        invariant(1 <= page && page <= this.#pages, `Invalid page: ${page}`);
    }

    destroyFinished = (page: number) => {
        this.#assertValidPage(page);
        this.#events.push({ type: EventType.DESTROY_FINISHED, page });
    };

    renderFinished = (page: number) => {
        this.#assertValidPage(page);
        this.#events.push({ type: EventType.RENDER_FINISHED, page });
    };

    goToPage = (page: number) => {
        this.#assertValidPage(page);
        this.#events.push({ type: EventType.GO_TO_PAGE, page });
    };

    setY = (y: number) => {
        const height = this.height;
        invariant(0 <= y && y <= this.height, `${y} > ${height}`);
        this.#events.push({ type: EventType.SET_Y, y });
    };

    #setY(y: number) {
        const pageWithVGap = this.#pageHeight + this.#vGap;
        const pagesOutOfScreen = Math.floor(y / pageWithVGap);
        const remainingPixels = y % pageWithVGap;
        return {
            page: 1
                + pagesOutOfScreen
                + (remainingPixels > this.#vGap + this.#pageHeight / 2 ? 1 : 0),
        };
    }

    #loop = () => {
        let movementEvent: null | { event: Event; idx: number } = null;
        let newUpdate: PartialUpdate = {};

        if (this.#events.length === 0) {
            if (!this.#running) return;
            setTimeout(this.#loop);
            return;
        }

        const oldStates = this.#states.slice();
        const events = this.#events.slice();
        this.#events = [];

        let continueRender = false;
        for (let i = 0; i < events.length; ++i) {
            const event = events[i];
            const { type } = event;
            switch (type) {
                case EventType.SET_Y:
                case EventType.GO_TO_PAGE:
                    movementEvent = { event, idx: i };
                    break;
                // case EventType.RESIZE:
                //    break;
                case EventType.RENDER_FINISHED:
                case EventType.DESTROY_FINISHED:
                    continueRender = true;
                    const { page } = event;
                    const idx = page - 1;
                    const oldState = this.#states[idx];
                    if (type === EventType.RENDER_FINISHED) {
                        invariant(oldState === PageState.RENDER, `invalid state: ${oldState}`);
                        this.#states[idx] = PageState.RENDER_DONE;
                        this.#outstandingRender = null;
                    } else if (type === EventType.DESTROY_FINISHED) {
                        invariant(oldState === PageState.DESTROY, `invalid state: ${oldState}`);
                        this.#states[idx] = PageState.NONE;
                    } else invariant(false, `invalid event: ${type}`);
                    break;
            }
        }

        if (continueRender) {
            this.#rendered = new Set(
                this.#states
                    .map((x, i) => x === PageState.RENDER_DONE ? i + 1 : null)
                    .filter(i => i !== null),
            ) as Set<number>;
        }

        if (movementEvent !== null) {
            const { event } = movementEvent;
            if (event.type === EventType.GO_TO_PAGE) {
                const { page } = event;
                const { x, y } = this.#goToPage(page);
                newUpdate = { ...newUpdate, x, y, page };
            } else {
                invariant(event.type === EventType.SET_Y, `invalid type: ${event.type}`);
                const { page } = this.#setY(event.y);
                newUpdate = { ...newUpdate, page };
            }
            this.#currentPage = newUpdate.page!!;
        }

        const noPrev = this.#update === null;
        const newPage = this.#update?.page !== newUpdate.page;
        const resetRenderQueue = noPrev || newPage;

        if (resetRenderQueue || continueRender) {
            if (resetRenderQueue) {
                this.#renderQueueIdx = 0;
            }
            const { action, page } = this.#continueRender();
            if (
                action !== InternalType.BLOCKED_OTHER
                && action !== InternalType.BLOCKED_SELF
                && action !== InternalType.DONE
            ) {
                invariant(typeof page === "number", `invalid page: ${page} for action: ${action}`);
                newUpdate = { ...newUpdate, [action]: page };
                const oldState = this.#states[page - 1];
                if (action === InternalType.RENDER) {
                    invariant(this.#outstandingRender === null, `existing render: ${this.#outstandingRender}`);
                    invariant(oldState === PageState.NONE, `invalid state: ${oldState}`);
                    this.#outstandingRender = page;
                    this.#states[page - 1] = PageState.RENDER;
                } else if (action === InternalType.DESTROY) {
                    invariant(oldState === PageState.RENDER_DONE, `invalid state: ${oldState}`);
                    this.#states[page - 1] = PageState.DESTROY;
                } else {
                    invariant(false, `invalid action: ${action}`);
                }
            }
        }

        let statesChanged = false;
        for (let i = 0; i < oldStates.length; ++i) {
            if (this.#states[i] !== PageState.RENDER_DONE && this.#states[i] !== oldStates[i]) {
                statesChanged = true;
            }
        }

        if (noPrev) this.onUpdate({ ...newUpdate, states: this.#states });
        else {
            const diffed: Update = {};
            let notEmpty = false;
            for (const [k, v] of Object.entries(newUpdate)) {
                if (v !== this.#update!![k as keyof PartialUpdate]) {
                    diffed[k as keyof PartialUpdate] = v;
                    notEmpty = true;
                }
            }
            if (statesChanged) diffed.states = this.#states;
            if (notEmpty) this.onUpdate(diffed);
        }

        this.#update = newUpdate;
        if (!this.#running) return;
        setTimeout(this.#loop);
    };

    start() {
        this.#running = true;
        this.#loop();
    }

    stop() {
        this.#running = false;
    }
}
