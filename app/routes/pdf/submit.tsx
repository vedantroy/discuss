import { useEffect, useState } from "react";
import { fromURLSearchParams, SubmitContext, SubmitContextSerialized } from "~/api-transforms/submitContext";
import PreviewViewer from "~/components/PDFPreview";
import SUBMIT_CSS from "~/styles/submit.css";

export function links() {
    return [{ rel: "stylesheet", href: SUBMIT_CSS }];
}

export default function() {
    const [ctx, setCtx] = useState<SubmitContext | null>(null);
    const [postText, setPostText] = useState(
        "write plain text here\neventually i'll support markdown ...\n the UI library is not to my ... taste",
    );

    useEffect(() => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlSearchParams.entries());
        const deserialized = fromURLSearchParams(params as SubmitContextSerialized);
        setCtx(deserialized);
    }, []);

    return (
        <div className="w-full h-full flex flex-row bg-gray-100 p-4 gap-4">
            <div className="flex-1 bg-white shadow h-full p-4 font-semibold">
                <div className="text-lg">Title</div>
                <input className="Border-Appearance rounded w-full p-1"></input>
                <div className="text-lg mt-3">Excerpt</div>
                {ctx ? <PreviewViewer className="w-full" ctx={ctx} url="/test.pdf" /> : null}
                <div className="text-lg mt-3">Body</div>
                <textarea
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    className="textarea textarea-bordered w-full h-52 mt-1"
                >
                </textarea>
                <button className="btn bg-sky-500">Submit</button>
            </div>
            <div className="flex-1 bg-white shadow h-full">
                <div className="text-lg font-semibold">Preview (TODO)</div>
            </div>
        </div>
    );
}

// Going to use a terrible text-area for now -- no markdown support @ all!
// want to ship an MPV to brian; how sexy the markdown will not matter for that
