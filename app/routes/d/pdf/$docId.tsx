import { json, LoaderFunction, useLoaderData, useParams } from "remix";
import invariant from "tiny-invariant";
import { toId } from "~/api-transforms/spanId";
import Viewer from "~/components/PDFWindow";
import PDF_CSS from "~/components/PDFWindow/PDFViewer/styles/page.css";
import { getParam } from "~/route-utils/params";
import { authenticator } from "~/server/auth.server";
import {
    DocumentPayload,
    DocumentStatusCode,
    getPDFAndClub,
    PDFContext,
    ShortDocumentID,
    ShortUserID,
} from "~/server/queries.server";

export function links() {
    return [{ rel: "stylesheet", href: PDF_CSS }];
}

export const loader: LoaderFunction = async ({ params, request }) => {
    const docId = getParam(params, "docId");
    const userData = await authenticator.isAuthenticated(request);
    const doc = await getPDFAndClub(docId as ShortDocumentID, userData?.user?.shortId as ShortUserID);
    if (doc.type === DocumentStatusCode.MISSING) {
        throw json({ error: { type: DocumentStatusCode.MISSING } }, 404);
    }
    return json(doc.payload);
};

export default function Index() {
    const data = useLoaderData<DocumentPayload<PDFContext>>();
    const params = useParams();
    const docId = getParam(params, "docId");

    const highlights = data.docCtx.highlights.map(({ page, anchorIdx, focusIdx, shortId, ...rest }) => ({
        id: shortId,
        anchorId: toId(page, anchorIdx),
        focusId: toId(page, focusIdx),
        page,
        ...rest,
    }));

    return <Viewer docId={docId} highlights={highlights} url={data.docCtx.url} />;
}
