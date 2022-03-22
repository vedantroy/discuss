import { it } from "@jest/globals";
import type PageManager from "~/components/PDFViewer/controller/PageManager";
import { createPageManagerWithDefaults, MockPageViewport } from "./utils";

it("allows callbacks to be assigned to other objects", () => {
    const pm = createPageManagerWithDefaults();
    pm.goToPage(1);
    const obj = {
        renderFinished: pm.renderFinished,
    };
    expect(obj.renderFinished).not.toThrow();
});

function executeTrace(pm: PageManager, actions: Array<[string, ...any]>) {
    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        const name = action[0];
        const args = action.slice(1);
        expect((pm as any)[name]).toBeTruthy();
        try {
            (pm as any)[name as unknown as any](...args);
        } catch (e: unknown) {
            console.error(`Failed with trace: ${JSON.stringify(actions.slice(0, i + 1))}`);
            throw e;
        }
    }
}

it.only("does not create false cancels", () => {
    const actions = JSON.parse(
        `[["goToPage",8],["setY",5624],["renderFinished",8],["renderFinished",7],["renderFinished",9],["setY",5722],["setY",7951],["setY",12890],["setY",15983],["renderFinished",11]]`,
    );
    const opts = {
        renderQueues: [
            [1, 2, 3],
            [2, 1, 3],
            [3, 2, 4],
            [4, 3, 5],
            [5, 4, 6],
            [6, 5, 7],
            [7, 6, 8],
            [8, 7, 9],
            [9, 8, 10],
            [10, 9, 11],
            [11, 10, 12],
            [12, 11, 13],
            [13, 12, 14],
            [14, 13, 15],
            [15, 14, 16],
            [16, 15, 17],
            [17, 16, 18],
            [18, 17, 19],
            [19, 18, 20],
            [20, 19, 21],
            [21, 20, 19],
        ],
        pages: 21,
        hGap: 10,
        vGap: 10,
        pageBufferSize: 3,
    };
    const pm = createPageManagerWithDefaults({ ...opts, basePageWidth: 612, basePageHeight: 792 });
    debugger;
    executeTrace(pm, actions);
});
