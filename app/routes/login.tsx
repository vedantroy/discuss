import { Form, LoaderFunction } from "remix";
import { json, useLoaderData } from "remix";
import { SocialsProvider } from "remix-auth-socials";
import { authenticator, sessionStorage } from "~/server/auth.server";

type LoaderData = {
    error: { message: string } | null;
};

export const loader: LoaderFunction = async ({ request }) => {
    await authenticator.isAuthenticated(request, {
        successRedirect: "/pdf/123",
    });
    const session = await sessionStorage.getSession(
        request.headers.get("Cookie"),
    );
    const error = session.get(
        authenticator.sessionErrorKey,
    ) as LoaderData["error"];

    return json<LoaderData>({ error });
};

interface SocialButtonProps {
    provider: SocialsProvider;
    label: string;
}

const SocialButton: React.FC<SocialButtonProps> = ({ provider, label }) => (
    <Form action={`/auth/${provider}`} method="post">
        <button>{label}</button>
    </Form>
);

export default function Screen() {
    const { error } = useLoaderData<LoaderData>();

    return (
        <>
            {error && <div>{error.message}</div>}
            <SocialButton label="Google" provider={SocialsProvider.GOOGLE} />
        </>
    );
}
