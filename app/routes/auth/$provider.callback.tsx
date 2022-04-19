// TODO: Do we need to do CSRF protection here?
import { ActionFunction, Form, json, LoaderFunction, redirect, useLoaderData } from "remix";
import { SocialsProvider } from "remix-auth-socials";
import Input from "~/components/input";
import { getParam } from "~/route-utils/params";
import { authenticator, sessionStorage } from "~/server/auth.server";
import { updateSvg } from "jdenticon"
import { useEffect, useState } from "react";

type LoaderData = {
    displayName: string;
};

export let action: ActionFunction = async ({ request, params }) => {
    const provider = getParam(params, "provider")
    const userData = await authenticator.authenticate(provider, request);
    if (userData.meta.userExists) {
        throw new Error(`User already exists: can't re-create it`)
    }
    const formData = Object.fromEntries(await request.formData())
    console.log(formData)
};

export let loader: LoaderFunction = async ({ request, params }) => {
    const provider = getParam(params, "provider")
    // There's something going on here that prevents us from getting forged
    // Google identities (not sure what it is) (something related to OAuthV2 state parameter ??)
    // TODO: I should understand this, otherwise someone could (maybe??) fill out the DB with forged Google identities?
    const userData = await authenticator.authenticate(provider, request);

    if (!userData.meta.userExists) {
        const session = await sessionStorage.getSession(
            request.headers.get("Cookie"),
        );
        // We (might) need to manually update the session
        session.set(authenticator.sessionKey, userData);
        switch (provider) {
            case SocialsProvider.GOOGLE:
                return json({
                    displayName: userData.meta.google!!.profile.displayName,
                }, { headers: { "Set-Cookie": await sessionStorage.commitSession(session) } });
            default:
                throw new Error(`unsupported provider: ${provider}`);
        }
    }
    return redirect("/login");
};

const cleanDisplayName = (name: string) => name.trim()

const DENTICON_ID = "jsdenticon"
const INPUT_DISPLAY_NAME = "displayName"

export default function() {
    const data = useLoaderData<LoaderData>();
    const [displayName, setDisplayName] = useState(data.displayName)
    useEffect(() => {
        // If the SVG doesn't exist, this throws (which is fine)
        // Prevent input from being treated as truncated hash string??
        // See: https://github.com/dmester/jdenticon/issues/36
        updateSvg(`#${DENTICON_ID}`, '!' + displayName)
    }, [displayName])
    return (
        <div className="flex flex-col items-center justify-center w-full h-screen bg-gray-200">
            <div className="w-full mx-0 my-auto box-border card card-compact max-w-[50vw] bg-white shadow-xl">
                <div className="card-body gap-0">
                    <Form method="post" className="flex flex-col">
                        <label className="font-bold text-base">Display name</label>
                        <div className="text-sm text-gray-500 mb-1">This is shown on posts and comments</div>
                        <Input name={INPUT_DISPLAY_NAME} className="text-base py-1 px-1" defaultValue={displayName} onChange={e => setDisplayName(e.target.value)}></Input>
                        <label className="font-bold text-base mt-6">Profile Picture</label>
                        <div className="flex flex-row">
                            <svg id={DENTICON_ID} width={96} height={96}></svg>
                            <div>TODO: Support other propic options</div>
                        </div>
                        <button type="submit" className="btn mt-6">Create</button>
                    </Form>
                </div>
            </div>
        </div>
    );
}
