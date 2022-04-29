import Denticon from "~/components/primitives/denticon";
import { Col, Row } from "~/components/primitives/layout";
import { json, Link, LoaderFunction, Outlet, useLoaderData } from "~/mod";
import { isLoggedIn } from "~/route-utils/session";
import { authenticator } from "~/server/auth.server";
import { getUserPreview } from "~/server/queries/__index";
import { UserPreview } from "~/server/queries/common";

export const loader: LoaderFunction = async ({ request, params }) => {
    const userData = await authenticator.isAuthenticated(request);
    const user = await isLoggedIn(userData);
    if (!user) {
        return json({ user: null });
    }
    const preview = await getUserPreview(user.shortId);
    return json({ user: preview });
};

export default function() {
    const { user } = useLoaderData<{ user: UserPreview | null }>();
    const url = typeof window !== "undefined" ? window.location.href : "";
    return (
        <Col className="h-full">
            <Row className="w-full h-10 bg-gray-50 shadow shadow-gray-400 justify-center items-stretch z-50">
                <Row className="h-full w-full max-w-[1264px] items-center">
                    <div className="cursor-pointer h-full w-fit hover:bg-gray-200 text-center grid place-items-center px-4">Chimu</div>
                    <div className="ml-auto mr-2">
                        {!user && (
                            <Link to={`/login?redirectTo=${encodeURIComponent(url)}`} className="btn btn-sm">
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
