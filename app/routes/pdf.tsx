import { json, LoaderFunction, useLoaderData } from "remix";
import { toId } from "~/api-transforms/spanId";
import Viewer from "~/components/PDFWindow";
import PDF_CSS from "~/components/PDFWindow/PDFViewer/styles/page.css";

export function links() {
    return [{ rel: "stylesheet", href: PDF_CSS }];
}

type APIPostHighlight = {
    post: string;
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
        highlights: [{
            post: "https://example.org",
            page: 2,
            anchorIdx: 1,
            focusIdx: 8,
            anchorOffset: 2,
            focusOffset: 3,
        }],
    };
    return json(data);
};

export default function Index() {
    const data = useLoaderData<API>();

    const highlights = data.highlights.map(({ page, anchorIdx, focusIdx, ...rest }) => ({
        anchorId: `#${toId(page, anchorIdx)}`,
        focusId: `#${toId(page, focusIdx)}`,
        page,
        ...rest,
    }));

    return <Viewer highlights={highlights} url="/test.pdf" />;
}
