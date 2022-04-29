import copy from "copy-to-clipboard";
import _ from "lodash";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import invariant from "tiny-invariant";
import { toURLSearchParams } from "~/api-transforms/submitContext";
import { pdfjs } from "~/mod";
import { useSearchParams } from "~/mod";
import { getDeepLinkHighlight, getDeepLinkParams } from "./PDFViewer/display/deepLink";
import { makeRects } from "./PDFViewer/display/selection";
import Viewer, { MouseUpContext } from "./PDFViewer/display/ViewerInternal";
import { PostHighlight } from "./types";
import useWindowDimensions from "./useWindowDimensions";

type PDFWindowProps = {
    url: string;
    width: number;
    height: number;
    highlights: PostHighlight[];
    docId: string;
};

type ToastIds = {
    hotkey: string | null;
};

const HOTKEY_LINK = "l";
const HOTKEY_POST = "p";

function getNumParam(params: URLSearchParams, key: string, defaultValue: number): number {
    const value = params.get(key);
    if (value === null) {
        return defaultValue;
    }
    return parseInt(value);
}

export default function({ url: docSource, highlights, docId, width: pdfWidth, height: pdfHeight }: PDFWindowProps) {
    const [loaded, setLoaded] = useState(false);
    const docRef = useRef<PDFDocumentProxy | null>(null);
    const { width, height } = useWindowDimensions();

    const [params, setSearchParams] = useSearchParams();
    const linkedHighlightIds = new Set<string>(params.getAll("hid"));
    const firstPage = getNumParam(params, "page", 1);
    const pageOffset = getNumParam(params, "pageOffset", 0);

    // const removeParams = () => {
    //    const newParams = { ...Object.fromEntries(params) };
    //    delete newParams.page;
    //    delete newParams.pageOffset;
    //    setSearchParams(newParams);
    // };

    useEffect(() => {
        async function go() {
            const docTask = pdfjs.getDocument(docSource);
            const doc = await docTask.promise;
            docRef.current = doc;
            setLoaded(true);
        }
        go();
    }, []);

    const { current: toastIds } = useRef<ToastIds>({ hotkey: null });
    const selectionContextRef = useRef<MouseUpContext | null>(null);

    // Think this is simpler than react-hotkeys ...?
    if (typeof window !== "undefined") {
        // TODO: `useCallback` this
        window.onkeyup = useCallback((e: KeyboardEvent) => {
            if (toastIds.hotkey !== null) {
                const { key } = e;
                const isLink = key === HOTKEY_LINK;
                const isPost = key === HOTKEY_POST;
                if (!isLink && !isPost) return;
                e.preventDefault();

                const { current: ctx } = selectionContextRef;
                invariant(ctx, `invalid selection context`);

                if (isLink) {
                    const { anchorOffset, focusOffset, pageTextContainer } = ctx;
                    const { x, y } = pageTextContainer.getBoundingClientRect();
                    const rects = makeRects(ctx.anchorNode, ctx.focusNode, { anchorOffset, focusOffset, x, y });
                    const deeplinkOffset = Math.floor(Math.min(...rects.map(r => r.y)));

                    const params = new URLSearchParams(getDeepLinkParams(ctx, deeplinkOffset));
                    const url = `${location.protocol}//${location.host}${location.pathname}`;
                    const urlWithParams = `${url}?${params.toString()}`;
                    if (copy(urlWithParams)) {
                        toast.success(`Link copied to clipboard!`);
                    } else {
                        toast.error(`Failed to copy link to clipboard`);
                    }
                }

                if (isPost) {
                    let left = Infinity;
                    let right = -Infinity;
                    let top = Infinity;
                    let bottom = -Infinity;

                    for (const { x, y, width, height } of ctx.rects) {
                        left = Math.min(x, left);
                        right = Math.max(x + width, right);
                        bottom = Math.max(y + height, bottom);
                        top = Math.min(y, top);
                    }

                    const scale = (n: number) => Math.round(n * (1 / ctx.scale));

                    const params = new URLSearchParams(toURLSearchParams({
                        url: docSource,
                        left: scale(left),
                        top: scale(top),
                        width: scale(right - left),
                        height: scale(bottom - top),
                        rects: ctx.rects.map(({ x, y, width, height }) => ({
                            x: scale(x),
                            y: scale(y),
                            width: scale(width),
                            height: scale(height),
                        })),
                        page: ctx.page,
                        text: ctx.text,
                        anchorIdx: ctx.anchorIdx,
                        focusIdx: ctx.focusIdx,
                        anchorOffset: ctx.anchorOffset,
                        focusOffset: ctx.focusOffset,
                    }));

                    const url = `${location.protocol}//${location.host}/submit/pdf/${docId}`;
                    const urlWithParams = `${url}?${params.toString()}`;
                    window.open(urlWithParams, "_blank")!!.focus();
                }
            }
        }, []);
    }

    if (!loaded) return <div>loading...</div>;

    const pageToHighlights = _.groupBy(highlights, h => h.page);
    const deepLinkHighlight = getDeepLinkHighlight(params);
    console.log(deepLinkHighlight);

    return (
        <div>
            <Toaster reverseOrder={true} position="bottom-right" />
            <Viewer
                baseWidth={pdfWidth}
                baseHeight={pdfHeight}
                // clearSearchParams={removeParams}
                firstPage={firstPage}
                firstPageOffset={pageOffset}
                pageToHighlights={pageToHighlights}
                highlights={highlights}
                deepLinkHighlight={deepLinkHighlight}
                width={width}
                height={height}
                linkedHighlightIds={linkedHighlightIds}
                doc={docRef.current!!}
                onSelection={(ctx: MouseUpContext | null) => {
                    selectionContextRef.current = ctx;
                    const selectionRemoved = ctx === null;
                    if (toastIds.hotkey !== null) {
                        toast.remove(toastIds.hotkey);
                        toastIds.hotkey = null;
                    }
                    if (selectionRemoved) return;

                    const hotKeyToastId = toast(t => (
                        <div className="flex bg-white flex-col text-base">
                            <div className="flex flex-row items-center">
                                <kbd className="kbd kbd-sm">{HOTKEY_LINK}</kbd>
                                <div>
                                    &nbsp;- link
                                </div>
                            </div>
                            <div className="flex flex-row items-center pt-1">
                                <kbd className="kbd kbd-sm">{HOTKEY_POST}</kbd>
                                <div>
                                    &nbsp;- post
                                </div>
                            </div>
                        </div>
                    ), { duration: Infinity, style: { padding: "0px" } });
                    toastIds.hotkey = hotKeyToastId;
                }}
            />
        </div>
    );
}
