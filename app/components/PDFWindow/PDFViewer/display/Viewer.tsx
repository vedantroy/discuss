import * as pdfjs from "pdfjs-dist";
import { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { useEffect, useRef, useState } from "react";
import type { SelectionContext } from "./selection";
import useWindowDimensions from "./useWindowDimensions";
import Viewer from "./ViewerInternal";

type ViewerWrapperProps = {
    onSelection: (ctx: SelectionContext | null) => void;
};

export default function ViewerWrapper({ onSelection }: ViewerWrapperProps) {
    const [loaded, setLoaded] = useState(false);
    const docRef = useRef<PDFDocumentProxy | null>(null);
    const { width, height } = useWindowDimensions();

    useEffect(() => {
        async function go() {
            console.time("allLoad");
            console.time("firstRender");
            const docTask = pdfjs.getDocument("/test.pdf");
            const doc = await docTask.promise;
            docRef.current = doc;
            setLoaded(true);
        }
        go();
    }, []);

    return loaded
        ? (
            <Viewer
                onSelection={onSelection}
                width={width}
                height={height}
                doc={docRef.current!!}
                firstPage={1}
            />
        )
        : <div>Fetching document ...</div>;
}
