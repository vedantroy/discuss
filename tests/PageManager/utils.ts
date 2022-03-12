import { PageViewport } from "pdfjs-dist";
import PageManager, { makeRenderQueues } from "~/components/PDFViewer/controller/PageManager";

class MockPageViewport {
    width: number
    height: number

    constructor({width, height}: { width: number, height: number}) {
        this.width = width
        this.height = height
    }

    clone(...args: unknown[]) {
        return new MockPageViewport({ width: this.width, height: this.height })
    }
}

export const BASE_PAGE_WIDTH = 5;
export const BASE_PAGE_HEIGHT = 10;
export const V_GAP = 1;
export const H_GAP = 2;
export const PAGES = 10;
// using "export function" breaks
// TODO(ved): File a bug report w/ jest
export const createPageManagerWithDefaults = ({
    pages = PAGES,
    basePageWidth = BASE_PAGE_WIDTH,
    basePageHeight = BASE_PAGE_HEIGHT,
    hGap = H_GAP,
    vGap = V_GAP,
    onX = () => {},
    onY = () => {},
    onPageNumber = () => {},
    onPageRender = () => {},
    onPageDestroy = () => {},
    onPageCancel = () => {},
    pageBufferSize = 11,
} = {}) => {
    const renderQueues = makeRenderQueues(PAGES, pageBufferSize - 1);
    return new PageManager({
        baseViewport: new MockPageViewport({ width: basePageWidth, height: basePageHeight }) as PageViewport,
        renderQueues,
        pages,
        hGap,
        vGap,
        onX,
        onY,
        onPageNumber,
        onPageRender,
        onPageDestroy,
        pageBufferSize,
        onPageCancel,
    });
};
