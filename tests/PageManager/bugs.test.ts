import { it } from "@jest/globals";
import { createPageManagerWithDefaults } from "./utils";
it("allows callbacks to be assigned to other objects", () => {
    const pm = createPageManagerWithDefaults();
    pm.goToPage(1);
    const q = {
        renderFinished: pm.renderFinished,
    };
    expect(q.renderFinished).not.toThrow();
});
