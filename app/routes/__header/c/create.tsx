import {
    unstable_createFileUploadHandler,
    unstable_createMemoryUploadHandler,
    unstable_parseMultipartFormData,
} from "@remix-run/node";
import { useTransition } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import clsx from "clsx";
import { DataUnit } from "digital-unit-converter";
import _ from "lodash";
import React, { useState } from "react";
import { ValidatedForm, validationError } from "remix-validated-form";
import invariant from "tiny-invariant";
import * as zod from "zod";
import { zfd } from "zod-form-data";
import FileDropper from "~/components/FileDropper";
import ValidatedInput from "~/components/primitives/validatedInput";
import ValidatedTextarea from "~/components/primitives/validatedTextarea";
import { ActionFunction, redirect, useSubmit } from "~/mod";
import { assertLoggedIn } from "~/route-utils/response";
import { createClub } from "~/server/db/queries/club";
import { createDocs } from "~/server/db/queries/doc";
import storage from "~/server/storage";

const INPUT_NAME = "Name";
const INPUT_DESCRIPTION = "Description";
const INPUT_FILES = "Files";

const MAX_FILE_SIZE_BYTES = DataUnit.MEGABYTE.toBytes(100);
const MAX_FILE_SIZE_MB = DataUnit.BYTE.toMegabytes(MAX_FILE_SIZE_BYTES);
const isPDF = (x: File) => x.type === "application/pdf";

const baseSchema = zod.object({
    [INPUT_NAME]: zfd.text(zod.string().min(5).max(30)),
    [INPUT_DESCRIPTION]: zfd.text(zod.string().min(10).max(500)),
});

const serverValidator = withZod(baseSchema.and(zod.object({
    [INPUT_FILES]: zod.array(
        zfd.file().refine(isPDF),
        { required_error: "Club must have at least 1 file" },
    ),
})));
const clientValidator = withZod(baseSchema);

export const action: ActionFunction = async ({ request, params }) => {
    const user = await assertLoggedIn(request);
    // memory is bad if people are uploading tons of files @ same time
    // but that is unlikely for a while ...
    const handler = unstable_createMemoryUploadHandler({
        maxFileSize: MAX_FILE_SIZE_BYTES,
    });
    let formData: FormData;
    try {
        formData = await unstable_parseMultipartFormData(
            request,
            handler,
        );
    } catch (e: any) {
        // We can't use MeterError from remix
        if (e.message && e.message.includes("exceeded upload size")) {
            return validationError({ fieldErrors: { [INPUT_FILES]: e.message } });
        }
        // unknown error
        throw e;
    }

    const fieldValues = await serverValidator.validate(formData);
    if (fieldValues.error) return validationError(fieldValues.error);

    const { data } = fieldValues;
    const name = data[INPUT_NAME];
    const description = data[INPUT_DESCRIPTION];

    const storedDocs = await Promise.all(data[INPUT_FILES].map(async f => {
        const buf = Buffer.from(await f.arrayBuffer());
        invariant(f.type === "application/pdf");
        const docId = await storage.createFile(buf);
        // const doc = await pdfjs.getDocument(buf).promise;
        // const proxy = await doc.getPage(1);
        // const { width, height } = proxy.getViewport();
        const width = 0;
        const height = 0;
        return { docId, name: f.name, type: f.type, buf, width, height };
    }));

    const clubId = await createClub({
        isPublic: true,
        creatorId: user.shortId,
        name,
        description,
    });
    await createDocs({ clubId, docs: storedDocs });
    return redirect(`/c/${clubId}`);
};

export default function() {
    const [files, setFiles] = useState<File[]>([]);
    const submit = useSubmit();
    const transition = useTransition();
    const notIdle = transition.state !== "idle";

    return (
        <div className="bg-gray-100 flex-1 z-0">
            <ValidatedForm
                onSubmit={(d, e: React.FormEvent) => {
                    e.preventDefault();
                    const formData = new FormData();
                    formData.set(INPUT_DESCRIPTION, d.Description);
                    formData.set(INPUT_NAME, d.Name);
                    if (files) {
                        for (const [idx, file] of files.entries()) {
                            formData.set(`${INPUT_FILES}[${idx}]`, file);
                        }
                    }
                    submit(formData, { method: "post", encType: "multipart/form-data" });
                }}
                validator={clientValidator}
                defaultValues={{}}
                className="Container-Width flex-1 my-0 px-4 py-4 gap-4"
            >
                <div className="flex-1 bg-white shadow h-full p-4 font-semibold">
                    <div className="text-2xl w-full text-center">Create Club</div>
                    <div className="text-lg">Name</div>
                    <ValidatedInput name={INPUT_NAME} className="w-full p-1" />
                    <div className="text-lg mt-3">Description</div>
                    <ValidatedTextarea
                        name={INPUT_DESCRIPTION}
                        defaultValue=""
                        className="w-full h-32 mt-1"
                    />
                    <div className="text-lg">Add Files</div>
                    <FileDropper
                        checks={{
                            [`larger than ${MAX_FILE_SIZE_MB}mb`]: f =>
                                f.size > MAX_FILE_SIZE_BYTES,
                            [`not pdf`]: f => !isPDF(f),
                        }}
                        onFiles={(newFiles) => setFiles([...(files || []), ...newFiles])}
                        name={INPUT_FILES}
                    />
                    <div className="text-lg mt-3">Files</div>
                    {files.length > 0
                        ? (
                            <ul>
                                {files.map((file) => (
                                    <li key={file.name} className="text-sm">
                                        {file.name}
                                    </li>
                                ))}
                            </ul>
                        )
                        : <div className="text-sm">No files selected</div>}
                    <button
                        type="submit"
                        disabled={notIdle}
                        className={clsx("btn btn-primary mt-2", { "loading": notIdle })}
                    >
                        Submit
                    </button>
                </div>
            </ValidatedForm>
        </div>
    );
}
