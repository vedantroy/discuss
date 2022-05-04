// Taken from: https://www.remix-validated-form.io/reference/use-control-field
// (ctrl-f "controlled components")
// TODO: Should use hashes instead;
import _ from "lodash";
import { useRef, useState } from "react";
import { FileDrop } from "react-file-drop";
import { useHydrated } from "remix-utils";
import { useField } from "remix-validated-form";
import { Col } from "../primitives/layout";

type FileDropperProps = {
    checks?: Record<string, (file: File) => boolean>;
    name: string;
    onFiles: (files: File[]) => void;
};

export default function({ name, onFiles, checks }: FileDropperProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { error } = useField(name);
    const [skippedFiles, setSkippedFiles] = useState<Record<string, File[]>>({});
    const hydrated = useHydrated();

    const updateFiles = (newFiles: FileList | null) => {
        // length = 0  if user presses enter w/o doing anything
        if (newFiles?.length === 0 || newFiles === null) return;
        let newFilesArray = Array.from(newFiles);
        if (checks) {
            const nameAndCheck = _.toPairs(checks);
            const { keep = [], ...failed } = _.groupBy(
                newFilesArray,
                // copilot is smarter than me
                file => (_.find(nameAndCheck, ([_, check]) => check(file)) || ["keep"])[0],
            );
            setSkippedFiles(failed);
            if (keep.length > 0) onFiles(keep);
        } else onFiles(newFilesArray);
    };

    return (
        <div>
            <input
                multiple
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={e => updateFiles(e.target.files)}
            >
            </input>
            {hydrated && (
                <FileDrop
                    className="relative h-28 w-full bg-zinc-100  border-solid border-zinc-400 rounded border-2 cursor-pointer"
                    targetClassName="w-full h-full absolute flex flex-col items-center justify-center content-center text-center"
                    draggingOverFrameClassName=""
                    draggingOverTargetClassName="bg-zinc-200 border-zinc-600"
                    // targetClassName="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center"
                    frame={window.document}
                    onTargetClick={() => fileInputRef.current?.click()}
                    onDrop={(newFiles) => updateFiles(newFiles)}
                >
                    <div className="text-zinc-400">
                        Drag and drop files here or click to select files
                    </div>
                </FileDrop>
            )}
            {error && <div className="text-xs mt-0.5 text-rose-600">{error}</div>}
            {!_.isEmpty(skippedFiles) && (
                <Col className="gap-y-1">
                    {_.toPairs(skippedFiles)
                        .map(([name, files]) => (
                            <div>
                                <div className="text-xs mt-0.5 text-rose-600">
                                    Skipped because: {name}
                                </div>
                                <ul className="text-xs mt-0.5 text-rose-600">
                                    {files.map((file, i) => (
                                        <li className="whitespace-nowrap overflow-hidden text-ellipsis pr-2">
                                            - {file.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                </Col>
            )}
        </div>
    );
}
