import { useEffect, useState } from "react";
import { fromURLSearchParams, SubmitContext, SubmitContextSerialized } from "~/api-transforms/submitContext";
import PreviewViewer from "~/components/PDFPreview";
import SUBMIT_CSS from "~/styles/submit.css";

export function links() {
    return [{ rel: "stylesheet", href: SUBMIT_CSS }];
}

export default function() {
    const [ctx, setCtx] = useState<SubmitContext | null>(null);

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
                <div className="text-lg mt-2">Excerpt</div>
                {ctx ? <PreviewViewer className="w-full" ctx={ctx} url="/test.pdf" /> : null}
            </div>
            <div className="flex-1 bg-white shadow h-full">1</div>
        </div>
    );
}

// export default function() {
//    return <Composer />;
// }
