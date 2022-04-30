// TODO: Do we need to do CSRF protection here?
import { withYup } from "@remix-validated-form/with-yup";
import { updateSvg } from "jdenticon";
import { useEffect, useState } from "react";
import { SocialsProvider } from "remix-auth-socials";
import { ValidatedForm, validationError } from "remix-validated-form";
import invariant from "tiny-invariant";
import * as yup from "yup";
import ValidatedInput from "~/components/primitives/validatedInput";
import {
    ActionFunction,
    json,
    LoaderFunction,
    redirect,
    useLoaderData,
} from "~/mod";
import { getParam } from "~/route-utils/params";
import { getSession, setSessionHeader } from "~/route-utils/session";
import { authenticator, UserSession } from "~/server/auth.server";
import { insertUserWithGoogleIdentity } from "~/server/queries/auth";
import { ShortUserID } from "~/server/queries/common";

function makeConsecutiveChecker(char: string, n: number, prefix: string) {
    invariant(char.length === 1, `not character: ${char}`);
    return {
        validator: (_s: string | undefined) => {
            // Yes, _s can be undefined (not sure why)
            if (_s === undefined) return false;
            const s = _s as string;
            let cnt = 0;
            for (const c of s) {
                if (c === char) cnt++;
                else cnt = 0;
                if (cnt === n + 1) return false;
            }
            return true;
        },
        msg: `${prefix} cannot have more than ${n} consecutive ${
            char === " " ? "spaces" : `${char}`
        }`,
    };
}

const PREFIX = "Display name";
const { validator: hypenValidator, msg: hypenMsg } = makeConsecutiveChecker(
    "-",
    1,
    PREFIX,
);
const { validator: underscoreValidator, msg: underscoreMsg } =
    makeConsecutiveChecker(
        "_",
        1,
        PREFIX,
    );
const { validator: spaceValidator, msg: spaceMsg } = makeConsecutiveChecker(
    " ",
    1,
    PREFIX,
);

const INPUT_DISPLAY_NAME = "displayName";
const DISPLAY_MIN = 3;
const DISPLAY_MAX = 30;
const DISPLAY_NAME_REQUIREMENTS =
    `Display name must be between ${DISPLAY_MIN} & ${DISPLAY_MAX} characters and only contain alphanumeric / hyphen / underscore characters`;
const validator = withYup(
    yup.object({
        [INPUT_DISPLAY_NAME]: yup
            .string()
            .required()
            .label("Display Name")
            .trim()
            .min(3, DISPLAY_NAME_REQUIREMENTS)
            .max(30, DISPLAY_NAME_REQUIREMENTS)
            .matches(/^[a-z0-9\s_\-]+$/i, DISPLAY_NAME_REQUIREMENTS)
            .test("whitespace", spaceMsg, spaceValidator)
            .test("underscore", underscoreMsg, underscoreValidator)
            .test("hyphen", hypenMsg, hypenValidator),
    }),
);

type LoaderData = {
    displayName: string;
};

export let action: ActionFunction = async ({ request, params }) => {
    const provider = getParam(params, "provider");
    const userData = await authenticator.authenticate(provider, request);
    if (userData.meta.userExists) {
        throw new Error(`User already exists: can't re-create it`);
    }
    const fieldValues = await validator.validate(await request.formData());
    if (fieldValues.error) return validationError(fieldValues.error);
    const displayName = fieldValues.data[INPUT_DISPLAY_NAME];

    let userId: string;
    switch (provider) {
        case SocialsProvider.GOOGLE:
            const iden = userData.meta.google;
            invariant(iden, `Missing google identity`);
            const {
                profile: { displayName: googDisplayName, _json: { email, sub } },
            } = iden;
            userId = await insertUserWithGoogleIdentity({
                user: { displayName, email },
                google: { sub, email, displayName: googDisplayName },
            });
            break;
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }

    const session = await getSession(request);
    const newSession: UserSession = {
        meta: { userExists: true },
        user: { shortId: userId as ShortUserID },
    };
    session.set(authenticator.sessionKey, newSession);
    return redirect(`/login`, {
        headers: await setSessionHeader(session),
    });
};

export let loader: LoaderFunction = async ({ request, params }) => {
    const provider = getParam(params, "provider");
    // There's something going on here that prevents us from getting forged
    // Google identities (not sure what it is) (something related to OAuthV2 state parameter ??)
    // TODO: I should understand this, otherwise someone could (maybe??) fill out the DB with forged Google identities?
    const userData = await authenticator.authenticate(provider, request);

    // We need to save the session always; Cases:
    // 1. We come from $provider.tsx (userData.meta.userExists === true)
    //    We need to save that the user is logged in
    const session = await getSession(request);
    session.set(authenticator.sessionKey, userData);

    if (!userData.meta.userExists) {
        switch (provider) {
            case SocialsProvider.GOOGLE:
                return json({
                    displayName: userData.meta.google!!.profile.displayName,
                }, { headers: await setSessionHeader(session) });
            default:
                throw new Error(`unsupported provider: ${provider}`);
        }
    }

    return redirect("/login", {
        headers: await setSessionHeader(session),
    });
};

const DENTICON_ID = "jsdenticon";

export default function() {
    const data = useLoaderData<LoaderData>();
    const [displayName, setDisplayName] = useState(data.displayName);
    useEffect(() => {
        console.log("changing displayName");
        // If the SVG doesn't exist, this throws (which is fine)
        // Prevent input from being treated as truncated hash string??
        // See: https://github.com/dmester/jdenticon/issues/36
        updateSvg(`#${DENTICON_ID}`, "!" + displayName);
    }, [displayName]);
    return (
        <div className="flex flex-col items-center justify-center w-full h-screen bg-gray-200">
            <div className="w-full mx-0 my-auto box-border card card-compact max-w-[50vw] bg-white shadow-xl">
                <div className="card-body gap-0">
                    <ValidatedForm
                        defaultValues={{ displayName }}
                        validator={validator}
                        method="post"
                        className="flex flex-col"
                    >
                        <label className="font-bold text-base">Display name</label>
                        <div className="text-sm text-gray-500 mb-1">
                            This is shown on posts and comments
                        </div>
                        <ValidatedInput
                            className="w-full"
                            name={INPUT_DISPLAY_NAME}
                            onChange={e => setDisplayName(e.target.value)}
                        />
                        <label className="font-bold text-base mt-6">
                            Profile Picture
                        </label>
                        <div className="flex flex-row">
                            <svg id={DENTICON_ID} width={96} height={96}></svg>
                            <div>TODO: Support other propic options</div>
                        </div>
                        <button type="submit" className="btn btn-primary mt-6">
                            Create
                        </button>
                    </ValidatedForm>
                </div>
            </div>
        </div>
    );
}
