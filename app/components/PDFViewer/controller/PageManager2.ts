import { PageViewport } from "pdfjs-dist";
import invariant from "tiny-invariant";
import { makeDoNotCallMe } from "../common/helpers";

const ALWAYS_RENDER = 3;
const PRIORITY_GAP = 2;

const EventType = {
    GO_TO_PAGE: "go_to_page",
    SET_Y: "set_y",
    RESIZE: "resize",
    RENDER_FINISHED: "render_finished",
    CANCEL_FINISHED: "cancel_finished",
    DESTROY_FINISHED: "destroy_finished",
} as const;
type EventType = typeof EventType[keyof typeof EventType];

type Event =
    | { type: (typeof EventType.SET_Y); y: number }
    | { type: (typeof EventType.GO_TO_PAGE); page: number }
    | ({
        type: (typeof EventType.RENDER_FINISHED | typeof EventType.CANCEL_FINISHED | typeof EventType.DESTROY_FINISHED);
    } & { page: number });

// const PageUpdateType = {
//    NONE: "none",
//    RENDER: "render",
//    CANCEL: "cancel",
//    DESTROY: "destroy",
// } as const;
// type PageUpdateType = typeof PageUpdateType[keyof typeof PageUpdateType];

const InternalType = {
    DONE: "done",
    BLOCKED_SELF: "blocked_self",
    BLOCKED_OTHER: "blocked_other",
    RENDER: "render",
    CANCEL: "cancel",
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

type PartialUpdate = Omit<Update, "none">;
type Update = {
    x?: number;
    y?: number;
    render?: number;
    cancel?: number;
    destroy?: number;
    page?: number;
    none: number[];
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

    #rendered: Set<number>;
    #renderQueueIdx: number;
    #currentPage: number;
    #outstanding: { render: number | null };
    #update: PartialUpdate | null;
    onUpdate: (u: Update) => void;

    constructor({ renderQueues, pageBufferSize, hGap, vGap, baseViewport, pages }: PageManagerOpts) {
        invariant(
            pageBufferSize % 2 === 1 && pageBufferSize > 0,
            `page buffer size must be positive & odd, got ${pageBufferSize}`,
        );
        this.#events = [];
        this.#running = false;
        this.#rendered = new Set();
        this.#renderQueueIdx = -1;
        this.#currentPage = -1;
        this.renderQueues = renderQueues;
        this.#outstanding = { render: null };
        this.#pageBufferSize = pageBufferSize;
        this.#update = null;
        this.#vGap = vGap;
        this.#hGap = hGap;
        this.#baseViewport = baseViewport;
        this.#viewport = baseViewport;
        this.#pages = pages;
        this.onUpdate = makeDoNotCallMe("onUpdate");
    }

    #evictPage() {
        let toEvict = this.#outstanding.render || null;
        let minPriority = this.#outstanding.render ? getPriority(this.#currentPage, this.#outstanding.render) : null;
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
        if (pageToRender === this.#outstanding.render) {
            return { action: InternalType.BLOCKED_SELF, page: this.#outstanding.render };
        }

        const pageBufferFull = this.#rendered.size === this.#pageBufferSize;
        const pageBufferAlmostFull =
            (this.#rendered.size === this.#pageBufferSize - 1 && this.#outstanding.render !== null);

        if (pageBufferFull || pageBufferAlmostFull) {
            // Case 2: We can't render b/c there's no space
            const toEvict = this.#evictPage();
            return {
                action: toEvict === this.#outstanding.render
                    ? InternalType.CANCEL
                    : InternalType.DESTROY,
                page: toEvict,
            };
        }

        // Case 3: We can render but a page is already rendering
        // and it's lower priority than us. Cancel it.
        if (
            this.#outstanding.render !== null && this.#renderQueueIdx < ALWAYS_RENDER
            && this.#renderQueueIdx - getPriority(this.#currentPage, this.#outstanding.render) > PRIORITY_GAP
        ) {
            return { action: InternalType.CANCEL, page: this.#outstanding.render };
        }

        return this.#outstanding.render === null
            ? { action: InternalType.RENDER, page: pageToRender }
            : { action: InternalType.BLOCKED_OTHER, page: this.#outstanding.render };
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

    cancelFinished = (page: number) => {
        this.#assertValidPage(page);
        this.#events.push({ type: EventType.CANCEL_FINISHED, page });
    };

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
        const pageToEvent: Record<
            number,
            typeof EventType.RENDER_FINISHED | typeof EventType.CANCEL_FINISHED | typeof EventType.DESTROY_FINISHED
        > = {};

        let none: number[] = [];
        let newUpdate: PartialUpdate = {};

        if (this.#events.length === 0) {
            if (!this.#running) return;
            setTimeout(this.#loop);
            return;
        }

        const events = this.#events.slice();
        this.#events = [];

        let continueRender = false;
        for (let i = events.length - 1; i >= 0; --i) {
            const event = events[i];
            switch (event.type) {
                case EventType.SET_Y:
                case EventType.GO_TO_PAGE:
                    movementEvent ??= { event, idx: i };
                    break;
                // case EventType.RESIZE:
                //    break;
                case EventType.RENDER_FINISHED:
                case EventType.DESTROY_FINISHED:
                case EventType.CANCEL_FINISHED:
                    if (event.type === EventType.CANCEL_FINISHED) {
                        console.log("REGISTERING CANCEL" + event.page);
                    }
                    continueRender = true;
                    const { page } = event;
                    if (pageToEvent[page] === undefined) {
                        const isRender = event.type === EventType.RENDER_FINISHED;
                        isRender
                            ? this.#rendered.add(page)
                            : this.#rendered.delete(page);
                        if (!isRender) {
                            // TODO: Does this need to be an array??
                            none.push(page);
                        } else {
                            this.#outstanding.render = null;
                        }
                        // this.#outstanding.render = null;
                        pageToEvent[page] = event.type;
                    }
                    break;
            }
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
            console.log(events);
            console.log(action, page);
            if (
                action !== InternalType.BLOCKED_OTHER
                && action !== InternalType.BLOCKED_SELF
                && action !== InternalType.DONE
            ) {
                invariant(typeof page === "number", `invalid page: ${page} for action: ${action}`);
                newUpdate = { ...newUpdate, [action]: page };
                none = none.filter(x => x !== page);
                if (action === InternalType.RENDER) {
                    invariant(this.#outstanding.render === null, `existing render: ${this.#outstanding.render}`);
                    this.#outstanding.render = page;
                } else {
                    console.log("SETTING OUT-STANDING TO NULL");
                    this.#outstanding.render = null;
                }
            }
        }

        console.log(newUpdate, this.#update);

        if (noPrev) this.onUpdate({ ...newUpdate, none });
        else {
            const diffed: PartialUpdate = {};
            let notEmpty = false;
            for (const [k, v] of Object.entries(newUpdate)) {
                if (v !== this.#update!![k as keyof PartialUpdate]) {
                    diffed[k as keyof PartialUpdate] = v;
                    notEmpty = true;
                }
            }
            if (notEmpty) this.onUpdate({ ...diffed, none });
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
