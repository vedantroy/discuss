import { useLoaderData } from "@remix-run/react";
import { FaBookReader } from "react-icons/fa";
import { Col, Row } from "~/components/primitives/layout";
import { json, LoaderFunction } from "~/mod";
import { isLoggedIn } from "~/route-utils/session";
import { authenticator } from "~/server/auth.server";
// import { getClubsForUser, UserClubs } from "~/server/queries";

type LoaderData =
    | { loggedIn: true; clubs: any }
    | { loggedIn: false };

export const loader: LoaderFunction = async ({ request, params }) => {
    const userData = await authenticator.isAuthenticated(request);
    const user = isLoggedIn(userData);
    if (!user) {
        return json({ loggedIn: false });
    }
    return json({ loggedIn: true });
    // return json({ loggedIn: true, clubs: await getClubsForUser(user.shortId) });
};

export default function() {
    return (
        <>
            <Col className="w-full py-16 px-4 bg-violet-800 items-center">
                <Col>
                    <Row className="text-3xl text-white mb-8 font-medium">
                        <FaBookReader /> <span className="ml-4">Chimu</span>
                    </Row>
                    <h2 className="text-white w-full text-5xl font-semibold mb-8">
                        <span className="text-cyan-200">Learn</span> from books and papers{" "}
                        <span className="text-cyan-200">together.</span>
                    </h2>
                    <div className="text-white text-2xl">
                        A collaborative e-reader combined with a Q&A forum. For any PDF.
                    </div>
                </Col>
            </Col>
            <Col className="w-full h-50 bg-gray-100 items-center pt-8">
                <h2 className="text-3xl font-semibold mb-8">Access others' knowledge</h2>
                <div></div>
            </Col>
        </>
    );
}
