import { withYup } from "@remix-validated-form/with-yup";
import copy from "copy-to-clipboard";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { updateSvg } from "jdenticon";
import React, { Fragment, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { ActionFunction, Form, json, Link, LoaderFunction, useLoaderData } from "remix";
import { ValidatedForm, validationError } from "remix-validated-form";
import invariant from "tiny-invariant";
import * as yup from "yup";
import POST_CSS from "~/../styles/post.css";
import PreviewViewer from "~/components/PDFPreview";
import Denticon from "~/components/primitives/denticon";
import { Col, Row } from "~/components/primitives/layout";
import SubForm from "~/components/primitives/subactionForm";
import ValidatedTextarea from "~/components/primitives/validatedTextarea";
import { getParam } from "~/route-utils/params";
import { throwNotFoundResponse } from "~/route-utils/response";
import { isLoggedIn } from "~/route-utils/session";
import { authenticator } from "~/server/auth.server";
import { ObjectStatusCode, ShortQuestionID } from "~/server/queries/common";
import { createVote, removeVote } from "~/server/queries/q/common";
import { Answer, getPDFQuestion, MyVote, Question, submitAnswer } from "~/server/queries/q/pdf";
import colors from "~/vendor/tailwindcss/colors";

export function links() {
    return [{ rel: "stylesheet", href: POST_CSS }];
}

const INPUT_CONTENT = "Answer";
const answerValidator = withYup(yup.object({
    [INPUT_CONTENT]: yup
        .string()
        .required("Answer is required")
        .trim()
        .min(30, `${INPUT_CONTENT} must be at least 30 characters`)
        .max(10_000, `${INPUT_CONTENT} must be at most 10,000 characters`),
}));

export const action: ActionFunction = async ({ request, params }) => {
    // TODO: We should extract this into a method
    const questionId = getParam(params, "questionId") as ShortQuestionID;
    const userData = await authenticator.isAuthenticated(request);
    const user = isLoggedIn(userData);
    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const userId = user.shortId;

    const formData = await request.formData();
    const subaction = formData.get("subaction");

    if (subaction === "answer") {
        const fieldValues = await answerValidator.validate(formData);
        if (fieldValues.error) return validationError(fieldValues.error);

        const content = fieldValues.data[INPUT_CONTENT];
        await submitAnswer({
            userId: user.shortId,
            questionId,
            content,
        });
    } else if (subaction == "vote") {
        const voteData = Object.fromEntries(formData);
        const { actionType, voteType, parentId } = voteData as Record<string, string>;
        switch (actionType) {
            case "create":
                await createVote({ userId, votableUUID: parentId, up: voteType === "up" });
                break;
            case "remove":
                await removeVote({ userId, votableUUID: parentId });
                break;
            default:
                throw new Error(`Unknown action type: ${actionType}`);
        }
    }
    return null;
};

export const loader: LoaderFunction = async ({ request, context, params }) => {
    const userData = await authenticator.isAuthenticated(request);
    const user = isLoggedIn(userData);
    const questionId = getParam(params, "questionId");
    const question = await getPDFQuestion(questionId as ShortQuestionID, user?.shortId);
    if (question.type === ObjectStatusCode.MISSING) {
        throwNotFoundResponse();
    }
    invariant(question.type === ObjectStatusCode.VALID);
    return json(question.payload);
};

type BadgeProps = {
    createdDate: Date;
    userId: string;
    displayName: string;
    prefix: string;
};
const QuestionBadge = ({ createdDate, userId, displayName, prefix }: BadgeProps) => (
    <div
        className="w-[200px] text-gray-500 bg-sky-100 ml-auto"
        style={{ padding: "5px 6px 7px 7px" }}
    >
        <div className="text-xs">{prefix} {format(createdDate, "MMM, yyyy 'at' kk:mm")}</div>
        <div className="flex flex-row mt-1 items-center">
            <Denticon displayName={displayName} />
            <Link
                to={`/u/${userId}`}
                className="ml-2 mb-auto text-sm text-blue-600 hover:text-blue-800"
            >
                {displayName}
            </Link>
        </div>
    </div>
);

type AnswerHeaderProps = {
    answers: unknown[];
};

const AnswerHeader = ({ answers }: AnswerHeaderProps) => {
    const l = answers.length;
    return (
        <div className="w-full mb-4">
            <div className="text-xl">{l} Answer{l > 1 ? "s" : ""}</div>
        </div>
    );
};

function Arrow({ up, active, id }: { up: boolean; active: boolean; id: string }) {
    // https://stackoverflow.com/questions/4274489/how-can-i-make-an-upvote-downvote-button
    // TODO: The SVG has unnecessary height
    return (
        <SubForm subaction="vote" className="inline" method="post">
            <input type="hidden" name="actionType" value={active ? "remove" : "create"}></input>
            <input type="hidden" name="voteType" value={up ? "up" : "down"}></input>
            <input type="hidden" name="parentId" value={id}></input>
            <button type="submit">
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
        </SubForm>
    );
}

const Vote = ({ vote, score, id }: { vote?: MyVote; score: number; id: string }) => (
    <Col className="items-center">
        <Arrow id={id} up={true} active={Boolean(vote && vote.up)} />
        <div>{score}</div>
        <Arrow id={id} up={false} active={Boolean(vote && !vote.up)} />
    </Col>
);

const PostFrame = (
    { children, score, id, vote }: { children: React.ReactNode; score: number; id: string; vote?: MyVote },
) => (
    <Row className="w-full gap-x-2">
        <Col className="items-center w-fit">
            <Col className="items-center">
                <Vote id={id} vote={vote} score={score} />
            </Col>
        </Col>
        <Col className="flex-1">{children}</Col>
    </Row>
);

const AnswerDisplay = ({ answer }: { answer: Answer }) => {
    return (
        <PostFrame id={answer.id} vote={answer.vote} score={answer.score}>
            <div>{answer.content}</div>
            <Row className="mt-4 w-full">
                <QuestionBadge
                    prefix="answered"
                    createdDate={parseISO(answer.createdAt)}
                    userId={answer.user.shortId}
                    displayName={answer.user.displayName}
                />
            </Row>
        </PostFrame>
    );
};

const ComposerBox = () => {
    return (
        <ValidatedForm method="post" subaction="answer" validator={answerValidator}>
            <div className="w-full text-xl">Your Answer</div>
            <ValidatedTextarea name={INPUT_CONTENT} className="mt-2 w-full" />
            <button className="btn w-min mt-2">Submit</button>
        </ValidatedForm>
    );
};

export default function() {
    const data = useLoaderData<Question>();

    const {
        id,
        shortId,
        vote,
        title,
        score,
        content,
        page,
        document: { url, shortId: docShortId },
        rects,
        excerptRect,
        user: { image, shortId: userId, displayName },
        createdAt,
        answers,
    } = data;

    const createdDate = new Date(createdAt);

    console.log(vote);

    return (
        <>
            <Toaster position="bottom-right" />
            <div className="w-full max-w-[1264px] my-0 mx-auto px-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl break-words mt-6">{title}</h1>
                    <div className="flex flex-row">
                        <div className="text-sm mt-2 text-gray-500">Asked&nbsp;</div>
                        <div className="text-sm mt-2">
                            {/* TODO: Use better date formatting */}
                            {formatDistanceToNowStrict(createdDate, { addSuffix: true })}
                            &nbsp;
                        </div>
                    </div>
                    <div className="divider w-full h-0 my-0 mt-2 mb-6"></div>
                    <PostFrame id={id} vote={vote} score={score}>
                        <PreviewViewer
                            clickUrl={`/d/pdf/${docShortId}?page=${page}&pageOffset=${excerptRect.y}&hid=${shortId}`}
                            className="w-full"
                            pageRects={{ rects, outline: excerptRect }}
                            page={page}
                            url={url}
                        />
                        <div className="mt-2">{content}</div>
                        <div className="flex flex-row w-full mt-4">
                            <button
                                onClick={(_) => {
                                    const url = `${location.protocol}//${location.host}/q/pdf/${shortId}`;
                                    if (copy(url)) {
                                        toast.success(`Url copied to clipboard`);
                                    } else {
                                        toast.error(`Failed to copy url to clipboard`);
                                    }
                                }}
                                className="text-sm text-gray-500 h-min"
                            >
                                Share
                            </button>
                            <QuestionBadge
                                prefix="asked"
                                createdDate={createdDate}
                                userId={userId}
                                displayName={displayName}
                            />
                        </div>
                    </PostFrame>
                    {answers.length > 0 ? <AnswerHeader answers={answers} /> : null}
                    {answers.map((answer) => (
                        <Fragment key={answer.id}>
                            <AnswerDisplay answer={answer} />
                            <div className="divider w-full h-0 my-0 mt-4 mb-6"></div>
                        </Fragment>
                    ))}
                    <ComposerBox />
                </div>
            </div>
        </>
    );
}
