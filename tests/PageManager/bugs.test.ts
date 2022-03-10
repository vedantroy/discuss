import { it } from "@jest/globals";
import { createPageManagerWithDefaults } from "./utils";
it("allows callbacks to be assigned to other objects", () => {
    const pm = createPageManagerWithDefaults();
    pm.goToPage(1);
    const obj = {
        renderFinished: pm.renderFinished,
    };
    expect(obj.renderFinished).not.toThrow();
});
