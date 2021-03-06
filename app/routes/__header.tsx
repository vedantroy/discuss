import { useHydrated } from "remix-utils";
import Denticon from "~/components/primitives/denticon";
import { Col, Row } from "~/components/primitives/layout";
import { json, Link, LoaderFunction, Outlet, useLoaderData } from "~/mod";
import { isLoggedIn } from "~/route-utils/session";
import { authenticator } from "~/server/auth.server";
import { getUserPreview } from "~/server/db/queries/user";
import { UserPreview } from "~/server/model/types";

export const loader: LoaderFunction = async ({ request, params }) => {
    const userData = await authenticator.isAuthenticated(request);
    const user = await isLoggedIn(userData);
    if (!user) {
        return json({ user: null });
    }
    const preview = await getUserPreview(user.shortId);
    return json({ user: preview });
};

// TODO: We should not use max-width on the header
export default function() {
    const { user } = useLoaderData<{ user: UserPreview | null }>();
    const isHydrated = useHydrated();
    return (
        <Col className="h-screen">
            <Row className="w-full h-10 bg-gray-50 shadow shadow-gray-400 justify-center items-stretch z-50">
                <Row className="h-full Container-Width items-center">
                    <div className="cursor-pointer h-full w-fit hover:bg-gray-200 text-center grid place-items-center px-4">
                        Chimu!
                    </div>
                    <div className="ml-auto mr-2">
                        {(!user && isHydrated) && (
                            <Link
                                to={`/login?redirectTo=${
                                    encodeURIComponent(window.location.href)
                                }`}
                                className="btn btn-sm"
                            >
                                Login
                            </Link>
                        )}
                        {user && (
                            <Row className="items-center">
                                <Denticon displayName={user.displayName} />
                                <span className="ml-2">{user.displayName}</span>
                            </Row>
                        )}
                    </div>
                </Row>
            </Row>
            <Outlet />
        </Col>
    );
}
