import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { pdfjs } from "~/mod";

export default function usePDFDoc(url: string): PDFDocumentProxy | null {
    const [loaded, setLoaded] = useState(false);
    const docRef = useRef<PDFDocumentProxy | null>(null);
    useEffect(() => {
        async function go() {
            pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
            const docTask = pdfjs.getDocument(url);
            const doc = await docTask.promise;
            docRef.current = doc;
            setLoaded(true);
        }
        go();
    }, []);
    return loaded ? docRef.current : null;
}
