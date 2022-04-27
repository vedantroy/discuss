import _ from "lodash";
import { useState } from "react";
import { Link } from "remix";
import { fromId } from "~/api-transforms/spanId";
import { PostHighlight } from "../../types";

type CardProps = {
    hotKey?: number | null;
    text: string;
    active: boolean;
};
const Card = ({ hotKey = null, text, active }: CardProps) => {
    return (
        <div
            className={`card overflow-visible card-compact h-28 w-28 bg-zinc-200 cursor-pointer transition-shadow duration-75 shadow shadow-zinc-400 hover:shadow-md hover:shadow-zinc-500 ${
                active ? `shadow-md shadow-zinc-500` : ""
            }`}
        >
            {hotKey !== null
                ? (
                    <div className="h-5 w-5 absolute left-[-6px] top-[-6px] bg-rose-400 text-center shadow shadow-rose-600 text-white">
                        {hotKey}
                    </div>
                )
                : null}
            <div className="card-body" style={{ padding: "0.8rem" }}>
                <p className="max-h-24 overflow-hidden text-zinc-800">{text}</p>
            </div>
        </div>
    );
};

type PageProps = {
    page: number;
    highlights: PostHighlight[];
    activeHighlights: Set<string>;
    linkedHighlights: Set<string>;
};

const Page = ({ page, highlights, activeHighlights, linkedHighlights }: PageProps) => {
    const ordered = highlights.sort((a, b) => fromId(a.anchorId)[1] - fromId(b.anchorId)[1]);

    return (
        <>
            <div className="divider divider-horizontal my-3 text-zinc-800">{page}</div>
            <div className="flex flex-row gap-4">
                {ordered.map(({ title, id }) => (
                    <Link to={`/q/pdf/${id}`} target="_blank">
                        <Card key={id} active={activeHighlights.has(id) || linkedHighlights.has(id)} text={title} />
                    </Link>
                ))}
            </div>
        </>
    );
};

type FooterProps = {
    activeHighlights: Set<string>;
    linkedHighlights: Set<string>;
    pageToHighlights: Record<number, PostHighlight[]>;
};

export default function({ activeHighlights, pageToHighlights, linkedHighlights }: FooterProps) {
    const pages = _(pageToHighlights)
        .keys()
        // R.C bug :) -- (parseInt takes 2 params)
        .map(k => parseInt(k))
        .sort()
        .value();

    return (
        <div className="flex flex-row items-center absolute bottom-0 left-0 right-0 h-32 shadow shadow-zinc-500 bg-zinc-100 z-30 overflow-x-scroll">
            {pages.map(page => (
                <Page
                    linkedHighlights={linkedHighlights}
                    activeHighlights={activeHighlights}
                    key={page}
                    page={page}
                    highlights={pageToHighlights[page]}
                />
            ))}
        </div>
    );
}

// auto-assign keybindings to high-lighted comments
// *scroll* selected comments into view
