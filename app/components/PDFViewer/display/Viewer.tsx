import * as pdfjs from "pdfjs-dist";
import { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { useEffect, useRef, useState } from "react";
import useWindowDimensions from "./useWindowDimensions";
import Viewer from "./ViewerInternal";

export default function ViewerWrapper() {
    const [loaded, setLoaded] = useState(false);
    const docRef = useRef<PDFDocumentProxy | null>(null);
    const { width, height } = useWindowDimensions();

    useEffect(() => {
        async function go() {
            console.time("allLoad");
            console.time("firstRender");
            const docTask = pdfjs.getDocument("/test2.pdf");
            const doc = await docTask.promise;
            docRef.current = doc;
            setLoaded(true);
        }
        go();
    }, []);

    return loaded
        ? <Viewer width={width} height={height} doc={docRef.current!!} firstPage={8} />
        : <div>Fetching document ...</div>;
}
