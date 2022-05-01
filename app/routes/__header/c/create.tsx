import { useSubmit } from "@remix-run/react";
import { withZod } from "@remix-validated-form/with-zod";
import React, { useState } from "react";
import { ValidatedForm, validationError } from "remix-validated-form";
import * as zod from "zod";
import { zfd } from "zod-form-data";
import FileDropper from "~/components/FileDropper";
import { Col } from "~/components/primitives/layout";
import ValidatedInput from "~/components/primitives/validatedInput";
import ValidatedTextarea from "~/components/primitives/validatedTextarea";
import { ActionFunction, redirect } from "~/mod";
import { isLoggedIn } from "~/route-utils/session";
import { authenticator } from "~/server/auth.server";

const INPUT_NAME = "Name";
const INPUT_DESCRIPTION = "Description";
const INPUT_FILES = "Files";

const baseSchema = zod.object({
    [INPUT_NAME]: zfd.text(zod.string().min(5).max(50)),
    [INPUT_DESCRIPTION]: zfd.text(zod.string().min(10).max(500)),
});

const serverValidator = withZod(baseSchema.and(zod.object({
    [INPUT_FILES]: zod.array(zod.string()),
})));
const clientValidator = withZod(baseSchema.and(zod.object({
    [INPUT_FILES]: zod.preprocess(val => {
        console.log(Array.isArray(val));
        console.log(val);
        return val;
    }, zod.array(zfd.file())),
})));

export const action: ActionFunction = async ({ request, params }) => {
    const userData = await authenticator.isAuthenticated(request);
    const user = isLoggedIn(userData);
    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const fieldValues = await serverValidator.validate(await request.formData());
    if (fieldValues.error) return validationError(fieldValues.error);

    const files = fieldValues.data[INPUT_FILES];
    console.log(files);
};

export default function() {
    const [files, setFiles] = useState<File[]>([]);
    const submit = useSubmit();

    return (
        <div className="bg-gray-100 flex-1 z-0">
            <ValidatedForm
                encType="multipart/form-data"
                onSubmit={(d, e: React.FormEvent) => {
                    const formData = new FormData();
                    formData.set(INPUT_DESCRIPTION, d.Description);
                    formData.set(INPUT_NAME, d.Name);
                    for (const [idx, file] of files.entries()) {
                        formData.set(`${INPUT_FILES}[${idx}]`, file);
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
                    <FileDropper onFiles={setFiles} name={INPUT_FILES} />
                    <div className="text-lg mt-3">Files</div>
                    <Col>
                        <ul>
                            {files.map((file) => (
                                <li key={file.name} className="text-sm">{file.name}</li>
                            ))}
                        </ul>
                    </Col>
                    <button className="btn btn-primary mt-2">Submit</button>
                </div>
            </ValidatedForm>
        </div>
    );
}

// Going to use a terrible text-area for now -- no markdown support @ all!
// want to ship an MPV to brian; how sexy the markdown will not matter for that
