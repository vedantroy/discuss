import PDFViewer, { Worker } from "@phuocng/react-pdf-viewer";
import useWindowDimensions from "./useWindowDimensions";

export default function WindowViewer() {
    const { width, height } = useWindowDimensions();
    return (
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@2.13.216/build/pdf.worker.min.js">
            <div style={{ height }}>
                <PDFViewer fileUrl="/test2.pdf" />
            </div>
        </Worker>
    );
}
