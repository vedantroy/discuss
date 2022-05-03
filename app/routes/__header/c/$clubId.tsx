import {
    ActionFunction,
    unstable_createMemoryUploadHandler,
    unstable_parseMultipartFormData,
} from "@remix-run/node";
import clsx from "clsx";
import { DataUnit } from "digital-unit-converter";
import { ChangeEventHandler, useRef } from "react";
import { FaPencilAlt, FaPlus } from "react-icons/fa";
import invariant from "tiny-invariant";
import { Col, Row } from "~/components/primitives/layout";
import { Form, json, Link, LoaderFunction, useFetcher, useLoaderData } from "~/mod";
import { getParam } from "~/route-utils/params";
import { assertLoggedIn } from "~/route-utils/response";
import { createDocs } from "~/server/queries/c/create";
import { ObjectStatusCode, ShortClubID } from "~/server/queries/common";
import {
    ClubWithDocuments,
    getClubAuth,
    getClubIfViewable,
} from "~/server/queries/dbv2/queries/club";
import storage from "~/server/storage";

export const action: ActionFunction = async ({ request, params }) => {
    const user = await assertLoggedIn(request);
    const clubId = getParam(params, "clubId") as ShortClubID;
    const clubAuth = await getClubAuth(clubId, user.shortId);
    if (!(clubAuth.type === ObjectStatusCode.VALID && clubAuth.callerAccess.admin)) {
        throw json({ error: `not admin` }, 401);
    }

    const handler = unstable_createMemoryUploadHandler({
        maxFileSize: MAX_FILE_SIZE_BYTES,
    });
    // it's ok if it throws w/o a pretty error -- we do all validation on the client anyways
    const formData = await unstable_parseMultipartFormData(
        request,
        handler,
    );
    const f = formData.get("file") as File;
    if (!f || !isPDF(f)) {
        throw json({ error: `invalid file` }, 400);
    }

    // TODO: copy paste n stuff
    const buf = Buffer.from(await f.arrayBuffer());
    invariant(f.type === "application/pdf");
    const docId = await storage.createFile(buf);
    const width = 0;
    const height = 0;

    const doc = { docId, width, height, name: f.name, type: f.type, buf };
    await createDocs({ docs: [doc], clubId });
    return null;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const clubId = getParam(params, "clubId") as ShortClubID;
    const club = await getClubIfViewable(clubId, undefined);
    return json(club);
};

const Box = ({ name }: { name: string }) => (
    <Col className="h-6 box-border px-2 items-center bg-zinc-200 cursor-pointer shadow shadow-zinc-400 hover:shadow-md hover:shadow-zinc-500 transition-shadow">
        {name}
    </Col>
);

// todo: figure out how to centralize this stuff ...
const MAX_FILE_SIZE_BYTES = DataUnit.MEGABYTE.toBytes(5);
const MAX_FILE_SIZE_MB = DataUnit.BYTE.toMegabytes(MAX_FILE_SIZE_BYTES);
const isPDF = (x: File) => x.type === "application/pdf";

const UploadButton = (
    { fetcher, onError }: {
        fetcher: ReturnType<typeof useFetcher>;
        onError: (msg: string) => void;
    },
) => {
    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const submitting = fetcher.state !== "idle";

    const handleFileChange: ChangeEventHandler<HTMLInputElement> = () => {
        const form = formRef.current;
        if (!form) return;

        const formData = new FormData(form);
        const file = formData.get("file") as File;
        if (!file) return;

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return onError(`File larger than ${MAX_FILE_SIZE_MB}mb`);
        }

        if (!isPDF(file)) {
            return onError(`File not PDF`);
        }

        fetcher.submit(formData, {
            method: "post",
            encType: "multipart/form-data",
        });
    };

    return (
        <fetcher.Form ref={formRef}>
            <input
                ref={fileInputRef}
                name="file"
                type="file"
                onChange={handleFileChange}
                className="hidden"
            />
            <button
                className={clsx(
                    "ml-2 btn btn-sm btn-success",
                    submitting ? "loading" : "gap-2",
                )}
                type="button"
                onClick={() => fileInputRef.current?.click()}
            >
                {submitting ? null : <FaPlus />}
                {submitting ? "Uploading..." : "Upload"}
            </button>
            {/* JS only submission */}
            <input disabled type="submit" className="hidden" />
        </fetcher.Form>
    );
};

export default function() {
    const { name, documents } = useLoaderData<ClubWithDocuments>();
    const noDocs = documents.length === 0;

    const fetcher = useFetcher();

    return (
        <Col className="flex-1 items-center">
            <Row className="items-center mt-4">
                <h1 className="text-3xl">{name}</h1>
                <UploadButton fetcher={fetcher} onError={e => alert(e)} />
            </Row>
            <div className="divider divider-vertical m-0 mb-6"></div>
            {noDocs
                ? <div>No documents</div>
                : (
                    <Col className="gap-y-4">
                        {documents.map(doc => (
                            <Link to={`/d/pdf/${doc.shortId}`}>
                                <Box name={doc.name}></Box>
                            </Link>
                        ))}
                    </Col>
                )}
        </Col>
    );
}
