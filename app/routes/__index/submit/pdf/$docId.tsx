import { withYup } from "@remix-validated-form/with-yup";
import { useEffect, useState } from "react";
import { ValidatedForm, validationError } from "remix-validated-form";
import * as yup from "yup";
import { fromURLSearchParams, SubmitContext, SubmitContextSerialized } from "~/api-transforms/submitContext";
import PreviewViewer from "~/components/PDFPreview";
import ValidatedInput from "~/components/primitives/validatedInput";
import ValidatedTextarea from "~/components/primitives/validatedTextarea";
import { ActionFunction, redirect } from "~/mod";
import { getParam } from "~/route-utils/params";
import { isLoggedIn } from "~/route-utils/session";
import { authenticator } from "~/server/auth.server";
import { ShortDocumentID } from "~/server/queries/common";
import { createPDFPost } from "~/server/queries/submit/pdf";
import SUBMIT_CSS from "~/styles/submit.css";

export function links() {
    return [{ rel: "stylesheet", href: SUBMIT_CSS }];
}

const INPUT_TITLE = "Title";
const INPUT_CONTENT = "Content";
const INPUT_META = "Meta";

const validator = withYup(
    yup.object({
        [INPUT_TITLE]: yup
            .string()
            .required("Title is required")
            .label(INPUT_TITLE)
            .trim()
            .min(15, "Title must be at least 15 characters")
            .max(150, "Title must be at most 150 characters"),

        [INPUT_CONTENT]: yup
            .string()
            .required("Content is required")
            .label(INPUT_CONTENT)
            .min(15, "Content must be at least 15 characters"),

        [INPUT_META]: yup
            .object()
            .required(),
    }),
);

export const action: ActionFunction = async ({ request, params }) => {
    const docId = getParam(params, "docId");
    const userData = await authenticator.isAuthenticated(request);
    const user = isLoggedIn(userData);
    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const fieldValues = await validator.validate(await request.formData());
    if (fieldValues.error) return validationError(fieldValues.error);

    const { data } = fieldValues;
    const title = data[INPUT_TITLE];
    const content = data[INPUT_CONTENT];
    // this is untyped for now
    const meta = data[INPUT_META];
    const postId = await createPDFPost({
        userId: user.shortId,
        title,
        content,
        document: docId as ShortDocumentID,
        page: meta.page,
        excerptRect: { x: meta.left, y: meta.top, width: meta.width, height: meta.height },
        rects: meta.rects,
        excerpt: meta.text,
        focusIdx: meta.focusIdx,
        anchorIdx: meta.anchorIdx,
        anchorOffset: meta.anchorOffset,
        focusOffset: meta.focusOffset,
    });
    return redirect(`/q/pdf/${postId}`);
};

export default function() {
    const [ctx, setCtx] = useState<SubmitContext | null>(null);

    useEffect(() => {
        // Yes, right now people could submit garbage data to the DB
        // if that ever happens we'll switch out to Redis & be glad we are popular
        // to have hackers / griefers
        const urlSearchParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlSearchParams.entries());
        const deserialized = fromURLSearchParams(params as SubmitContextSerialized);
        setCtx(deserialized);
    }, []);

    return (
        <div className="bg-gray-100 flex-1 z-0">
            <ValidatedForm
                validator={validator}
                method="post"
                defaultValues={{}}
                className="w-full max-w-[1264px] flex-1 mx-auto my-0 flex flex-row p-4 gap-4"
            >
                <div className="flex-1 bg-white shadow h-full p-4 font-semibold">
                    <div className="text-lg">Title</div>
                    <ValidatedInput name={INPUT_TITLE} className="w-full p-1" />
                    <div className="text-lg mt-3">Excerpt</div>
                    {ctx
                        ? (
                            <PreviewViewer
                                className="w-full"
                                pageRects={{
                                    rects: ctx.rects,
                                    outline: { x: ctx.left, y: ctx.top, width: ctx.width, height: ctx.height },
                                }}
                                page={ctx.page}
                                url={ctx.url}
                            />
                        )
                        : null}
                    <div className="text-lg mt-3">Body</div>
                    <ValidatedTextarea
                        name={INPUT_CONTENT}
                        defaultValue=""
                        className="w-full h-52 mt-1"
                    />
                    <input name={INPUT_META} type="hidden" value={JSON.stringify(ctx)}></input>
                    <button className="btn btn-primary">Submit</button>
                </div>
            </ValidatedForm>
        </div>
    );
}

// Going to use a terrible text-area for now -- no markdown support @ all!
// want to ship an MPV to brian; how sexy the markdown will not matter for that
