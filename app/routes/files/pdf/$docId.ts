import { LoaderFunction } from "~/mod";
import { getParam } from "~/route-utils/params";
import { authenticator } from "~/server/auth.server";
import { canEditDocument, clubFromDoc } from "~/server/queries/accessControl";
import { ShortDocumentID } from "~/server/queries/common";
import storage from "~/server/storage";

export const loader: LoaderFunction = async ({ request, params }) => {
    const docId = getParam(params, "docId");
    // Only serve the file if the user is authorized

    const user = await authenticator.isAuthenticated(request);
    const canEdit = await canEditDocument(
        docId as ShortDocumentID,
        user?.user?.shortId,
    );
    // this is an internal link for serving assets only
    // so we don't care about nice error messages
    return canEdit ? new Response(storage.getFile(`pdf/${docId}`)) : null;
};
