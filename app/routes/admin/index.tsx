import { LoaderFunction } from "@remix-run/server-runtime";
import { Col, Row } from "~/components/primitives/layout";
import { json, Link, useLoaderData } from "~/mod";
import { assertAdmin } from "~/route-utils/response";
import { getAllUsersWithClubs, UserWithClub } from "~/server/db/queries/user";

export const loader: LoaderFunction = async ({ request, params }) => {
    await assertAdmin(request);
    const usersWithClubs = await getAllUsersWithClubs();
    return json(usersWithClubs);
};

export default function() {
    const data = useLoaderData<UserWithClub[]>();
    return (
        <Col className="gap-y-4">
            {data.map(u => (
                <Row className="gap-x-4" key={u.shortId}>
                    <div className="font-semibold">{u.displayName}</div>
                    {u.clubs.admin.map(c => (
                        <Link target="_blank" to={`/c/${c.shortId}`}>{c.name}</Link>
                    ))}
                </Row>
            ))}
        </Col>
    );
}
