import PageManager from "~/components/PDFViewer/controller/PageManager";

export const BASE_PAGE_HEIGHT = 10;
export const V_GAP = 1;
export const H_GAP = 2;
export const PAGES = 10;
// using "export function" breaks
// TODO(ved): File a bug report w/ jest
export const createPageManagerWithDefaults = ({
    pages = PAGES,
    basePageWidth = 10,
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
    return new PageManager({
        pages,
        basePageWidth,
        basePageHeight,
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
