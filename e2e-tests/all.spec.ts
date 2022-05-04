import { expect, Page, test } from "@playwright/test";
import * as fs from "fs";

const getUrl = (x: string) => `http://localhost:3005${x}`;

test("login", async ({ page, context }) => {
    const cookieValue = fs.readFileSync("./e2e-tests/document_cookie").toString();
    await page.goto(getUrl("/"));
    await page.evaluate(cookieValue => {
        document.cookie = cookieValue;
    }, cookieValue);
    await page.pause();
});
