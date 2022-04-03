import copy from "copy-to-clipboard";
import * as pdfjs from "pdfjs-dist";
import { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import invariant from "tiny-invariant";
import { getDeepLinkParams } from "./PDFViewer/display/deepLink";
import { SelectionContext } from "./PDFViewer/display/selection";
import Viewer from "./PDFViewer/display/ViewerInternal";
import useWindowDimensions from "./useWindowDimensions";

type PDFWindowProps = {
    url: string;
};

type ToastIds = {
    hotkey: string | null;
};

const HOTKEY_LINK = "l";
const HOTKEY_POST = "p";

export default function({ url }: PDFWindowProps) {
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
    const selectionContextRef = useRef<SelectionContext | null>(null);

    // Think this is simpler than react-hotkeys ...?
    if (typeof window !== "undefined") {
        window.onkeyup = e => {
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
                }
            }
        };
    }

    if (!loaded) return <div>loading...</div>;

    return (
        <div>
            <Toaster reverseOrder={true} position="bottom-right" />
            <Viewer
                firstPage={1}
                width={width}
                height={height}
                doc={docRef.current!!}
                onSelection={(ctx: SelectionContext | null) => {
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
