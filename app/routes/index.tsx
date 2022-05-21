import { Link } from "@remix-run/react";
import { FaBookReader } from "react-icons/fa";
import { SiDiscord } from "react-icons/si"; import { Col, Row } from "~/components/primitives/layout";
import type { LinksFunction } from "~/mod";
// import { json, LoaderFunction } from "~/mod";
// import { isLoggedIn } from "~/route-utils/session";
// import { authenticator } from "~/server/auth.server";
import INDEX_CSS from "~/styles/index.css";

export const links: LinksFunction = () => {
    return [{ href: INDEX_CSS, rel: "stylesheet" }];
};

// type LoaderData =
//     | { loggedIn: true; clubs: any }
//     | { loggedIn: false };
//
// export const loader: LoaderFunction = async ({ request, params }) => {
//     const userData = await authenticator.isAuthenticated(request);
//     const user = isLoggedIn(userData);
//     if (!user) {
//         return json({ loggedIn: false });
//     }
//     return json({ loggedIn: true });
//     // return json({ loggedIn: true, clubs: await getClubsForUser(user.shortId) });
// };

const ImageItem = ({ src, children }: { src: string; children: React.ReactNode }) => (
    <Col className="max-w-[400px]">
        <div className="w-full text-center text-gray-700 mb-1">{children}</div>
        <img
            className="shadow-lg shadow-gray-400 max-h-[360px]"
            src={src}
            width={400}
        />
    </Col>
);

export default function() {
    return (
        <Col className="h-full">
            <Col className="w-full py-16 px-4 bg-violet-800 items-center">
                <Col>
                    <Row className="justify-between w-full">
                        <Row className="text-3xl text-white mb-8 font-medium">
                            <FaBookReader /> <span className="ml-4">Chimu</span>
                        </Row>
                        <a href="https://discord.gg/ns4FeJnYNm">
                            <Row className="items-center">
                                <span className="mr-2 text-white">Discord</span>{" "}
                                <SiDiscord color="white" size={25} />
                            </Row>
                        </a>
                    </Row>
                    <h2 className="text-white w-full text-5xl font-semibold mb-8">
                        <span className="text-cyan-200">Learn</span> from books and papers{" "}
                        <span className="text-cyan-200">together.</span>
                    </h2>
                    <div className="text-white text-2xl">
                        A collaborative e-reader combined with a Q&A forum. For any PDF.
                    </div>
                    <Row className="mt-8 gap-x-4">
                        <Link
                            className="btn bg-cyan-500 border-cyan-500 hover:bg-cyan-600 hover:border-cyan-600"
                            to={"/dash"}
                        >
                            Get Started
                        </Link>
                        <a className="btn" href="https://chimu.sh/d/pdf/RVy_2UTemDx0J9dcYuiEi"> View Example
                        </a>
                    </Row>
                </Col>
            </Col>
            <Col className="flex-1 w-full bg-gray-100 items-center py-8 px-2">
                <h2 className="text-3xl font-semibold mb-8">Access others' knowledge</h2>
                <div className="w-full flex flex-col items-center gap-y-8 xl:flex-row xl:justify-center xl:gap-x-12">
                    <ImageItem src="/image/landing/1.png">
                        Read and see the highlights of other people
                    </ImageItem>
                    <ImageItem src="/image/landing/2.png">
                        Post by highlighting text and pressing <b>p</b>
                    </ImageItem>
                    <ImageItem src="/image/landing/3.png">
                        Get answers from other people on the forum
                    </ImageItem>
                </div>
            </Col>
        </Col>
    );
}
