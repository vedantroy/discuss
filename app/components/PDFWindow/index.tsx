import copy from "copy-to-clipboard";
import _ from "lodash";
import * as pdfjs from "pdfjs-dist";
import { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import invariant from "tiny-invariant";
import { toURLSearchParams } from "~/api-transforms/submitContext";
import { getDeepLinkParams } from "./PDFViewer/display/deepLink";
import Viewer, { MouseUpContext } from "./PDFViewer/display/ViewerInternal";
import { PostHighlight } from "./types";
import useWindowDimensions from "./useWindowDimensions";

type PDFWindowProps = {
    url: string;
    highlights: PostHighlight[];
};

type ToastIds = {
    hotkey: string | null;
};

const HOTKEY_LINK = "l";
const HOTKEY_POST = "p";

const toNum = (s: string) => {
    const noPx = s.slice(0, -"px".length);
    const f = parseFloat(noPx);
    invariant(!isNaN(f), `invalid style: ${s}`);
    return Math.round(f);
};

export default function({ url, highlights }: PDFWindowProps) {
    const [loaded, setLoaded] = useState(false);
    const docRef = useRef<PDFDocumentProxy | null>(null);
    const { width, height } = useWindowDimensions();

    useEffect(() => {
        async function go() {
            const docTask = pdfjs.getDocument(url);
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
                    const params = new URLSearchParams(getDeepLinkParams(ctx));
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
                    }));

                    console.log(params);

                    const url = `${location.protocol}//${location.host}/pdf/submit`;
                    const urlWithParams = `${url}?${params.toString()}`;
                    window.open(urlWithParams, "_blank")!!.focus();

                    // TODO: Might be able to merge these 2 lines
                    // We should generate a preview link

                    // we need to get the viewbox of the selection
                    // this time: plan
                    // 1. we iterate over all nodes to find x/y
                    // 2. we adjust for scale
                }
            }
        }, []);
    }

    if (!loaded) return <div>loading...</div>;

    const pageToHighlights = _.groupBy(highlights, h => h.page);

    return (
        <div>
            <Toaster reverseOrder={true} position="bottom-right" />
            <Viewer
                pageToHighlights={pageToHighlights}
                highlights={highlights}
                firstPage={1}
                width={width}
                height={height}
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
