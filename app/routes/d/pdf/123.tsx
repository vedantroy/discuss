import { json, LoaderFunction, useLoaderData } from "remix";
import { toId } from "~/api-transforms/spanId";
import Viewer from "~/components/PDFWindow";
import PDF_CSS from "~/components/PDFWindow/PDFViewer/styles/page.css";

export function links() {
    return [{ rel: "stylesheet", href: PDF_CSS }];
}

type APIPostHighlight = {
    id: string;
    text: string;
    page: number;
    anchorIdx: number;
    focusIdx: number;
    anchorOffset: number;
    focusOffset: number;
};

type API = {
    highlights: APIPostHighlight[];
};

export const loader: LoaderFunction = async () => {
    const data: API = {
        highlights: [
            {
                id: "id1",
                text: "a comment",
                page: 2,
                anchorIdx: 0,
                focusIdx: 3,
                anchorOffset: 2,
                focusOffset: 20,
            },
            {
                id: "id2",
                page: 2,
                text: "another comment",
                anchorIdx: 4,
                focusIdx: 7,
                anchorOffset: 2,
                focusOffset: 5,
            },
            {
                id: "id3",
                page: 2,
                text: "yet another comment",
                anchorIdx: 5,
                focusIdx: 6,
                anchorOffset: 2,
                focusOffset: 1,
            },
            {
                id: "id4",
                page: 3,
                text: "new page!",
                anchorIdx: 6,
                focusIdx: 6,
                anchorOffset: 1,
                focusOffset: 5,
            },
            {
                id: "id5",
                page: 3,
                text: "new page!",
                anchorIdx: 7,
                focusIdx: 9,
                anchorOffset: 1,
                focusOffset: 5,
            },
            {
                id: "id6",
                page: 3,
                text: "new page!",
                anchorIdx: 10,
                focusIdx: 12,
                anchorOffset: 1,
                focusOffset: 1,
            },
        ],
    };
    return json(data);
};

export default function Index() {
    const data = useLoaderData<API>();

    const highlights = data.highlights.map(({ page, anchorIdx, focusIdx, ...rest }) => ({
        anchorId: toId(page, anchorIdx),
        focusId: toId(page, focusIdx),
        page,
        ...rest,
    }));

    return <Viewer highlights={highlights} url="/test.pdf" />;
}
