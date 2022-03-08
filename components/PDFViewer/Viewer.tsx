import * as pdfjs from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import { useEffect, useRef, useState } from "react";
import PageManager, { PageManagerOpts } from "./controller/PageManager";
// TODO: check bundle size
import { range } from "lodash-es";

export default function Viewer({ pageManagerConfig }: {
    pageManagerConfig: PageManagerOpts;
}) {
    const [pageNumber, setPageNumber] = useState<number>(0);
    const { current: pages } = useRef<PDFPageProxy[]>([]);
    const { current: pageManager } = useRef<PageManager>(
        new PageManager({
            ...pageManagerConfig,
            onPageNumber: setPageNumber,
            async onPageRender(n) {
                //
            },
            onPageCancel(n) {
            },
            onPageDestroy(n) {
            },
        }),
    );

    useEffect(() => {
        const initializePages = async () => {
            const docTask = pdfjs.getDocument("");
            const doc = await docTask.promise;

            const promises: Promise<void>[] = [];
            range(doc.numPages)
                .forEach(pageNum => {
                    const getPage = async () => {
                        const pageProxy = await doc.getPage(pageNum);
                        pages[pageNum - 1] = pageProxy;
                    };
                    promises.push(getPage());
                });
            await Promise.all(promises);

            const pm = new PageManager({
                ...pageManagerConfig,
                onPageNumber: setPageNumber,
                async onPageRender(n) {
                    const idx = n - 1;
                    const prom = pages[n].render({});
                },
                onPageCancel(n) {
                },
                onPageDestroy(n) {
                },
            });
        };
        initializePages();
    }, []);
}
