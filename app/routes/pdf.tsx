import Viewer from "~/components/PDFWindow";
import PDF_CSS from "~/components/PDFWindow/PDFViewer/styles/page.css";

export function links() {
    return [{ rel: "stylesheet", href: PDF_CSS }];
}

export default function Index() {
    return <Viewer url="/test.pdf" />;
}
