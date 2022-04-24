import { ActionFunction, Form, json, LoaderFunction, useLoaderData } from "remix";
import invariant from "tiny-invariant";
import POST_CSS from "~/../styles/post.css";
import PreviewViewer from "~/components/PDFPreview";
import { getParam } from "~/route-utils/params";
import { throwNotFoundResponse } from "~/route-utils/response";
import { isLoggedIn } from "~/route-utils/session";
import { authenticator } from "~/server/auth.server";
import db, { e } from "~/server/edgedb.server";
import { getQuestion, ObjectStatusCode, Question, ShortQuestionID } from "~/server/queries.server";
import colors from "~/vendor/tailwindcss/colors";

export function links() {
    return [{ rel: "stylesheet", href: POST_CSS }];
}

const VoteAction = {
    UP: "up",
    DOWN: "down",
} as const;
type VoteAction = typeof VoteAction[keyof typeof VoteAction];

export const action: ActionFunction = async ({ request, params }) => {
    // extract the vote
    const formData = await request.formData();
    const { _action } = Object.fromEntries(formData) as { _action: VoteAction };
    switch (_action) {
        case VoteAction.UP:
            // e.insert(e.Vote, { up: true, post:  })
            break;
        case VoteAction.DOWN:
            break;
    }
    // console.log(`THE DATABASE IS NOW: ${JSON.stringify(db, null, 2)}`);
    return db;
};

export const loader: LoaderFunction = async ({ request, context, params }) => {
    const userData = await authenticator.isAuthenticated(request);
    const user = isLoggedIn(userData);
    const questionId = getParam(params, "questionId");
    const question = await getQuestion(questionId as ShortQuestionID, user?.shortId);
    if (question.type === ObjectStatusCode.MISSING) {
        throwNotFoundResponse();
    }
    invariant(question.type === ObjectStatusCode.VALID);
    return json(question.payload);
};

function Arrow({ up, active }: { up: boolean; active: boolean }) {
    // https://stackoverflow.com/questions/4274489/how-can-i-make-an-upvote-downvote-button
    // TODO: The SVG has unnecessary height
    return (
        <Form className="inline" method="post">
            <button type="submit" name="_action" value={up ? VoteAction.UP : VoteAction.DOWN}>
                <span>
                    <svg width="36" height="26" {...(up && { transform: "scale(-1 -1)" })}>
                        <path
                            d="M2 10h32L18 26 2 10z"
                            fill={active ? up ? colors.green[400] : colors.rose[400] : colors.gray[400]}
                        >
                        </path>
                    </svg>
                </span>
            </button>
        </Form>
    );
}

export default function() {
    const data = useLoaderData<Question>();
    console.log(data);

    const { title, content, page, document: { url }, rects, excerptRect } = data;

    return (
        <>
            <div className="w-full h-10 bg-gray-50 shadow shadow-gray-300 flex flex-row justify-center items-stretch">
                <div className="h-full w-full max-w-[1264px]">
                    <div className="cursor-pointer h-full w-fit hover:bg-gray-200 text-center grid place-items-center px-4">
                        Collab Books!
                    </div>
                </div>
            </div>
            <div className="w-full max-w-[1264px] my-0 mx-auto px-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl break-words mt-6">{title}</h1>
                    <div className="flex flex-row">
                        <div className="text-sm mt-2 text-gray-500">Asked&nbsp;</div>
                        <div className="text-sm mt-2">9 years ago&nbsp;</div>
                        <div className="text-sm mt-2 text-gray-500">Viewed&nbsp;</div>
                        <div className="text-sm mt-2">100 times</div>
                    </div>
                    <div className="divider w-full h-0 my-0 mt-2 mb-6"></div>
                    <div className="flex flex-row">
                        <div className="flex flex-col items-center w-fit">
                            <Arrow up={true} active={true} />
                            <div>0</div>
                            <Arrow up={false} active={false} />
                        </div>
                        <PreviewViewer
                            className="w-full pl-2"
                            pageRects={{ rects, outline: excerptRect }}
                            page={page}
                            url={url}
                        />
                    </div>
                    <div>{content}</div>
                </div>
            </div>
        </>
    );
}
