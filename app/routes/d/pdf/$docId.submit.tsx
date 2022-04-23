import { withYup } from "@remix-validated-form/with-yup";
import { useEffect, useState } from "react";
import { ActionFunction } from "remix";
import { ValidatedForm, validationError } from "remix-validated-form";
import * as yup from "yup";
import { fromURLSearchParams, SubmitContext, SubmitContextSerialized } from "~/api-transforms/submitContext";
import PreviewViewer from "~/components/PDFPreview";
import Input from "~/components/primitives/input";
import Textarea from "~/components/primitives/textarea";
import ValidatedInput from "~/components/primitives/validatedInput";
import ValidatedTextarea from "~/components/primitives/validatedTextarea";
import SUBMIT_CSS from "~/styles/submit.css";

export function links() {
    return [{ rel: "stylesheet", href: SUBMIT_CSS }];
}

const INPUT_TITLE = "Title";
const INPUT_CONTENT = "Content";

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
            .min(30, "Content must be at least 30 characters"),
    }),
);

export const action: ActionFunction = async ({ request, params }) => {
    const fieldValues = await validator.validate(await request.formData());
    if (fieldValues.error) return validationError(fieldValues.error);
};

export default function() {
    const [ctx, setCtx] = useState<SubmitContext | null>(null);
    // const [postText, setPostText] = useState(
    //    "write plain text here\neventually i'll support markdown ...\n the UI library is not to my ... taste",
    // );

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
        <ValidatedForm
            validator={validator}
            method="post"
            defaultValues={{}}
            className="w-full h-full flex flex-row bg-gray-100 p-4 gap-4"
        >
            <div className="flex-1 bg-white shadow h-full p-4 font-semibold">
                <div className="text-lg">Title</div>
                <ValidatedInput name={INPUT_TITLE} className="w-full p-1" />
                <div className="text-lg mt-3">Excerpt</div>
                {ctx ? <PreviewViewer className="w-full" ctx={ctx} url={ctx.url} /> : null}
                <div className="text-lg mt-3">Body</div>
                <ValidatedTextarea
                    name={INPUT_CONTENT}
                    defaultValue=""
                    // onChange={e => setPostText(e.target.value)}
                    className="w-full h-52 mt-1"
                />
                <button className="btn btn-primary">Submit</button>
            </div>
        </ValidatedForm>
    );
}

// Going to use a terrible text-area for now -- no markdown support @ all!
// want to ship an MPV to brian; how sexy the markdown will not matter for that
