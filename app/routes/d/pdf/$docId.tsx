import invariant from "tiny-invariant";
import { toId } from "~/api-transforms/spanId";
import Viewer from "~/components/PDFWindow";
import PDF_CSS from "~/components/PDFWindow/PDFViewer/styles/page.css";
import { json, LoaderFunction, useLoaderData, useParams } from "~/mod";
import { getParam } from "~/route-utils/params";
import { authenticator } from "~/server/auth.server";
import { getPDFWithMetadata, PDFContext } from "~/server/db/queries/docs/pdf";
import {
    DocumentPayload,
    ObjectStatusCode,
    ShortDocumentID,
    ShortUserID,
} from "~/server/model/types";

export function links() {
    return [{ rel: "stylesheet", href: PDF_CSS }];
}

export const loader: LoaderFunction = async ({ params, request }) => {
    const docId = getParam(params, "docId");
    const userData = await authenticator.isAuthenticated(request);
    const doc = await getPDFWithMetadata(
        docId as ShortDocumentID,
        userData?.user?.shortId as ShortUserID,
    );
    if (doc.type === ObjectStatusCode.MISSING) {
        throw json({ error: { type: ObjectStatusCode.MISSING } }, 404);
    }
    invariant(doc.type === ObjectStatusCode.VALID, `Invalid doc type: ${doc.type}`);
    return json(doc.payload);
};

export default function Index() {
    const data = useLoaderData<DocumentPayload<PDFContext>>();
    const params = useParams();
    const docId = getParam(params, "docId");

    const highlights = data.docCtx.highlights.map((
        { page, anchorIdx, focusIdx, shortId, ...rest },
    ) => ({
        id: shortId,
        anchorId: toId(page, anchorIdx),
        focusId: toId(page, focusIdx),
        page,
        ...rest,
    }));

    const { width, height } = data.docCtx;
    return (
        <Viewer
            title={data.metadata.docName}
            width={width}
            height={height}
            docId={docId}
            highlights={highlights}
            url={`/storage/pdf/${docId}`}
        />
    );
}
