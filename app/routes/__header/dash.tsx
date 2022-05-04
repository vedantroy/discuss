import clsx from "clsx";
import { FaExternalLinkAlt, FaPlus } from "react-icons/fa";
import { Col, Row } from "~/components/primitives/layout";
import { json, Link, useLoaderData } from "~/mod";
import { LoaderFunction } from "~/mod";
import { redirectToLogin } from "~/route-utils/response";
import { isLoggedIn } from "~/route-utils/session";
import { authenticator } from "~/server/auth.server";
import { getClubsForUser, UserClubs } from "~/server/db/queries/user";
import { ShortClubID } from "~/server/model/types";

// priority: ship
// meta lesson: if the site gets big I'm hiring a pro UI designer
// the product does not have identity yet --
// it will once I get users & figure out the "true" direction
// THIS IS NOT A ROCKET SCIENCE UI

type LoaderData = {
    clubs: UserClubs;
};

export const loader: LoaderFunction = async ({ request, params }) => {
    const userData = await authenticator.isAuthenticated(request);
    const user = isLoggedIn(userData);
    if (!user) {
        return redirectToLogin("/dash");
    }

    const clubs = await getClubsForUser(user.shortId);
    return json({ clubs });
};

const Header = (
    { children, className }: { children: React.ReactNode; className?: string },
) => (
    <h2 className={clsx("text-3xl", className)}>
        {children}
    </h2>
);

// wait, you can do this with tailwind ... :D
const HEADER_POS = "mt-4 ml-4 self-start";
const HeaderWithAction = (
    { children, action }: {
        children: React.ReactNode;
        action?: React.ReactElement | false;
    },
) => action
    ? (
        <Row
            className={clsx("justify-start w-full items-center gap-x-4", HEADER_POS)}
        >
            <Header>{children}</Header>
            {action || null}
        </Row>
    )
    : <Header className={HEADER_POS}>{children}</Header>;

const AddButton = ({ className }: { className?: string }) => (
    <Link
        to={`/c/create`}
        className={clsx("btn btn-sm gap-2 btn-success", className)}
    >
        <FaPlus />
        Create
    </Link>
);

const JoinLink = ({ className }: { className?: string }) => (
    <Link className={clsx("btn btn-sm btn-info gap-2", className)} to={"/"}>
        <FaExternalLinkAlt />
        Explore Clubs
    </Link>
);

const ClubCard = (
    { name, shortId, description }: {
        name: string;
        description: string;
        shortId: ShortClubID;
    },
) => (
    <Link to={`/c/${shortId}`}>
        <div
            className={`h-28 min-w-28 p-2 cursor-pointer rounded bg-gray-100 hover:bg-gray-200 transition-shadow duration-75 shadow shadow-gray-400 hover:shadow-md hover:shadow-gray-500`}
        >
            <h3 className="w-full text-center text-lg font-semibold mb-2">{name}</h3>
            <div>
                <p className="max-h-24 text-ellipses text-gray-800">{description}</p>
            </div>
        </div>
    </Link>
);

export default function dash() {
    const { clubs: { admin, writer } } = useLoaderData<LoaderData>();
    const hasAdminClubs = admin.length > 0;
    const hasJoinedClubs = writer.length > 0;
    return (
        <div className="flex-1">
            <Col className="h-full w-full items-center">
                <HeaderWithAction
                    action={hasAdminClubs && <AddButton />}
                >
                    My Clubs
                </HeaderWithAction>
                {hasAdminClubs
                    ? (
                        // TODO: fix grid styling ...
                        <div className="grid grid-cols-2 p-4 gap-4 w-full">
                            {admin.map(c => (
                                <ClubCard
                                    key={c.shortId}
                                    name={c.name}
                                    description={c.description}
                                    shortId={c.shortId}
                                />
                            ))}
                        </div>
                    )
                    : (
                        <div>
                            <span>You have no clubs!</span>
                            <AddButton className="ml-2" />
                        </div>
                    )}
                <HeaderWithAction action={hasJoinedClubs && <JoinLink />}>
                    Joined Clubs
                </HeaderWithAction>
                {hasJoinedClubs
                    ? <div>Your clubs</div>
                    : (
                        <div>
                            <span>You have joined no clubs!</span>
                            <JoinLink className="ml-2" />
                        </div>
                    )}
            </Col>
        </div>
    );

    // return <div className="Container-Width">dash2</div>;
}
