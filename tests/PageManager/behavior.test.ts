import { expect, it } from "@jest/globals";
import _ from "lodash";
import PageManager, { makeRenderQueues } from "~/components/PDFViewer/controller/PageManager";
import { BASE_PAGE_HEIGHT, createPageManagerWithDefaults, H_GAP, PAGES, V_GAP } from "./utils";

type ListenerName =
    | "onPageNumber"
    | "onPageRender"
    | "onPageDestroy"
    | "onX"
    | "onY";
type AwaiterReturnDict = Partial<Record<ListenerName, number | number[]>>;

function createAwaiter(
    pm: PageManager,
    keys: Array<ListenerName | null> | ListenerName,
    { timeoutMs = undefined }: { timeoutMs?: number } = {},
): Promise<AwaiterReturnDict | null> {
    let timedOut = false;
    const result: AwaiterReturnDict = {};
    let callbacksFinished = 0;
    keys = typeof keys === "string" ? [keys] : keys;
    keys = keys.filter(k => k !== null);

    const p: Promise<AwaiterReturnDict> = new Promise((resolve, reject) => {
        for (const key of keys as ListenerName[]) {
            pm[key] = (x: number | number[]) => {
                if (timedOut) {
                    throw Error(`Listener finished but awaiter timed out`);
                }
                result[key] = x;
                callbacksFinished += 1;
                if (callbacksFinished === keys.length) {
                    resolve(result);
                }
            };
        }
    });

    if (timeoutMs !== undefined) {
        return Promise.race([
            p,
            new Promise<AwaiterReturnDict | null>((resolve, reject) => {
                setTimeout(() => {
                    timedOut = true;
                    resolve(callbacksFinished !== 0 ? result : null);
                }, timeoutMs);
            }),
        ]);
    } else return p;
}

it("updates the current page number when scrolling", async () => {
    const pm = createPageManagerWithDefaults();

    async function getPageNumber(y: number) {
        const p = createAwaiter(pm, "onPageNumber", { timeoutMs: 1 });
        pm.setY(y);
        const res = await p;
        return res && res.onPageNumber;
    }

    let pageNumber = await getPageNumber(0);
    expect(pageNumber).toStrictEqual(1);

    const midpointOfPage1 = V_GAP + BASE_PAGE_HEIGHT / 2;

    pageNumber = await getPageNumber(midpointOfPage1 - 1);
    expect(pageNumber).toStrictEqual(null);

    // Fence-post problem: We choose to stay @ the lower page number
    pageNumber = await getPageNumber(midpointOfPage1);
    expect(pageNumber).toStrictEqual(null);

    pageNumber = await getPageNumber(midpointOfPage1 + 1);
    expect(pageNumber).toStrictEqual(2);

    const midpointOfPage2 = V_GAP + BASE_PAGE_HEIGHT + V_GAP + BASE_PAGE_HEIGHT / 2;

    pageNumber = await getPageNumber(midpointOfPage2 - 1);
    expect(pageNumber).toStrictEqual(null);

    // Fence-post problem: again
    pageNumber = await getPageNumber(midpointOfPage2);
    expect(pageNumber).toStrictEqual(null);

    pageNumber = await getPageNumber(midpointOfPage2 + 1);
    expect(pageNumber).toStrictEqual(3);
});

// TODO: Is this test useless?
it("computes height", () => {
    const pm = createPageManagerWithDefaults();
    expect(pm.height).toStrictEqual(BASE_PAGE_HEIGHT * PAGES + V_GAP * PAGES + 1);
});

it("updates x/y & current page when going to a specific page", async () => {
    const pm = createPageManagerWithDefaults();

    async function getXY(page: number, excludeX: boolean = false) {
        const p = createAwaiter(pm, ["onY", "onPageNumber", excludeX ? null : "onX"], { timeoutMs: 1 });
        pm.goToPage(page);
        const r = await p;
        return r && { ...r };
    }

    let r = await getXY(1);
    expect(r?.onPageNumber).toStrictEqual(1);
    expect(r?.onPageNumber).toStrictEqual(1);
    expect(r?.onY).toStrictEqual(V_GAP);
    expect(r?.onX).toStrictEqual(H_GAP);

    r = await getXY(1);
    expect(r).toStrictEqual(null);

    r = await getXY(2, true);
    expect(r?.onPageNumber).toStrictEqual(2);
    expect(r?.onY).toStrictEqual(V_GAP + BASE_PAGE_HEIGHT + V_GAP);
});

it("creates valid render queues", () => {
    const dec = (x: number) => x - 1;
    let rq = makeRenderQueues(3, dec(1));
    expect(rq).toStrictEqual([[1], [2], [3]]);

    rq = makeRenderQueues(3, dec(3));
    expect(rq).toStrictEqual([[1, 2, 3], [2, 1, 3], [3, 2, 1]]);

    rq = makeRenderQueues(3, dec(5));
    expect(rq).toStrictEqual([[1, 2, 3], [2, 1, 3], [3, 2, 1]]);
});

it("updates renders when going to a page", async () => {
    const pm = createPageManagerWithDefaults();
    async function getNextRender(f: () => void, timeoutMs: number | undefined = undefined) {
        const p = createAwaiter(pm, ["onPageRender"], { timeoutMs });
        f();
        const r = await p;
        return r && { ...r };
    }

    let r = await getNextRender(() => pm.goToPage(1));
    expect(r?.onPageRender).toStrictEqual(1);
    expect(pm.currentRender).toStrictEqual(1);

    for (let i = 1; i <= 9; ++i) {
        r = await getNextRender(() => pm.renderFinished());
        expect(r?.onPageRender).toStrictEqual(i + 1);
    }

    r = await getNextRender(() => pm.renderFinished(), 1);
    expect(r).toStrictEqual(null);

    for (let i = 1; i <= 10; ++i) {
        r = await getNextRender(() => pm.goToPage(i), 1);
        expect(r).toStrictEqual(null);
    }
});

async function pull(pm: PageManager, f: Function, {
    render = [],
    destroy = [],
}: { render?: number[]; destroy?: number[] }) {
    const a = render?.length || 0;
    const b = destroy?.length || 0;

    const renderIt = a > 0 ? pm.createOnPageRenderIterator(a) : null;
    const destroyIt = b > 0 ? pm.createOnPageDestroyIterator(b) : null;
    const renders = [];
    const destroys = [];

    f();

    if (a > 0) {
        for await (const x of renderIt!!) {
            renders.push(x);
            pm.renderFinished();
        }
    }

    if (b > 0) {
        for await (const x of destroyIt!!) {
            destroys.push(x);
        }
    }

    expect(renders).toStrictEqual(render);
    expect(destroys).toStrictEqual(destroy);
    return { renders, destroys };
}

async function assertNoChanges(pm: PageManager, f: Function) {
    const renderIt = pm.createOnPageRenderIterator();
    const destroyIt = pm.createOnPageDestroyIterator();

    f();

    {
        let cancel = false;
        async function assertNoRender() {
            for await (const x of renderIt) {
                if (!cancel) {
                    fail(`found value: ${x} in render`);
                } else break;
            }
        }

        await Promise.race([
            assertNoRender(),
            new Promise((resolve, _) =>
                setTimeout(() => {
                    cancel = true;
                    resolve(null);
                }, 0)
            ),
        ]);
    }

    {
        let cancel = false;
        async function assertNoDestroy() {
            for await (const x of destroyIt) {
                if (!cancel) {
                    fail(`found value: ${x} in render`);
                } else break;
            }
        }
        await Promise.race([
            assertNoDestroy(),
            new Promise((resolve, _) =>
                setTimeout(() => {
                    cancel = true;
                    resolve(null);
                }, 0)
            ),
        ]);
    }
}

it("uses a sliding window of renders when going to sequential pages", async () => {
    const pm = createPageManagerWithDefaults({ pageBufferSize: 5 });

    const cPull = _.curry(pull)(pm);
    const cAssertNoChanges = _.curry(assertNoChanges)(pm);

    await cPull(() => pm.goToPage(1), { render: [1, 2, 3, 4, 5], destroy: [] });

    await cAssertNoChanges(() => pm.goToPage(2));
    await cAssertNoChanges(() => pm.goToPage(3));

    await cPull(() => pm.goToPage(4), { render: [6], destroy: [1] });
    await cPull(() => pm.goToPage(5), { render: [7], destroy: [2] });

    await cPull(() => pm.goToPage(10), { render: [10, 9, 8], destroy: [3] });
    await cAssertNoChanges(() => pm.goToPage(9));
    await cAssertNoChanges(() => pm.goToPage(8));

    expect(pm.rendered).toStrictEqual(new Set([6, 7, 10, 9, 8]));

    // You know: while this testing code was a *massive pain*
    // to write it did catch this failing line so maybe worth?
    await cPull(() => pm.goToPage(7), { render: [5], destroy: [10] });
    await cPull(() => pm.goToPage(6), { render: [4], destroy: [9] });
});

it("cancels unneeded renders", async () => {
    const pm = createPageManagerWithDefaults({ pageBufferSize: 5 });
    const renderIt = pm.createOnPageRenderIterator();
    const destroyIt = pm.createOnPageDestroyIterator();
    const cancelIt = pm.createOnPageCancelIterator();

    pm.goToPage(1);
    let i = 0;
    const expectedRenderRequests = [
        // actually rendered
        1,
        2,
        // requested but cancelled
        3, /* i = 2 */
        // actually rendered
        8,
        7,
        // requested but cancelled
        9, /* i = 5 */
        // actually rendered
        5,
        4, // evicts 1
        6, // evicts 2
        3, // evicts 8
    ];
    for await (const page of renderIt) {
        expect(page).toStrictEqual(expectedRenderRequests[i]);
        if (i === 2) {
            pm.goToPage(8);
        } else if (i === 5) {
            pm.goToPage(5);
        } else {
            pm.renderFinished();
        }
        i += 1;
        if (i === expectedRenderRequests.length) break;
    }

    const expectedDestroy = [1, 2, 8];
    i = 0;
    for await (const page of destroyIt) {
        expect(page).toStrictEqual(expectedDestroy[i]);
        i += 1;
        if (i === expectedDestroy.length) break;
    }

    const expectedCancel = [3, 9];
    i = 0;
    for await (const page of cancelIt) {
        expect(page).toStrictEqual(expectedCancel[i]);
        i += 1;
        if (i === expectedCancel.length) break;
    }
});
