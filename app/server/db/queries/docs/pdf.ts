import { PDFPost } from "dbschema/edgeql-js";
import _ from "lodash";
import { nanoid } from "nanoid";
import invariant from "tiny-invariant";
import { Rect } from "~/components/PDFWindow/types";
import {
    ClubResource,
    CommonPostProps,
    DocumentPayload,
    ObjectStatusCode,
    ShortDocumentID,
    ShortQuestionID,
    ShortUserID,
} from "~/server/model/types";
import db, { e } from "../../edgedb.server";
import { getDocMetadataWithAuth } from "./common";

// Gonna flex my type checking on you
const pdfHighlightFields = [
    "title",
    "shortId",
    "page",
    "anchorIdx",
    "focusIdx",
    "anchorOffset",
    "focusOffset",
] as const;
type PDFHighlightField = typeof pdfHighlightFields[number];
export type PDFContext = {
    width: number;
    height: number;
    highlights: Array<Pick<PDFPost, PDFHighlightField>>;
};

export async function getPDFWithMetadata(
    docId: ShortDocumentID,
    userId?: ShortUserID,
): Promise<ClubResource<DocumentPayload<PDFContext>>> {
    const am = await getDocMetadataWithAuth(docId, userId);
    if (am === null) return { type: ObjectStatusCode.MISSING };
    if (am.auth.type !== ObjectStatusCode.VALID) return am.auth;

    const docCtxQuery = e.select(e.PDF, pdf => ({
        baseWidth: true,
        baseHeight: true,
        posts: _.fromPairs(pdfHighlightFields.map(k => [k, true])) as Record<
            PDFHighlightField,
            true
        >,
        filter: e.op(pdf.shortId, "=", docId),
        limit: 1,
    }));

    const docCtx = await docCtxQuery.run(db);
    if (docCtx === null) {
        // This could happen if the document was deleted since the last query
        // But what's the realistic chance of that happening?
        console.log(`Suspicious delete: ${am.meta.docName} under club: ${am.meta.clubName}`);
        invariant(false, `If this happens & it's legit, just remove this invariant`);
        return { type: ObjectStatusCode.MISSING };
    }

    return {
        type: ObjectStatusCode.VALID,
        callerAccess: am.auth.callerAccess,
        payload: {
            metadata: am.meta,
            docCtx: {
                width: docCtx.baseWidth,
                height: docCtx.baseHeight,
                highlights: docCtx.posts,
            },
        },
    };
}

type PDFPostProps = {
    document: ShortDocumentID;

    page: number;
    excerptRect: Rect;
    anchorIdx: number;
    focusIdx: number;
    anchorOffset: number;
    focusOffset: number;
    rects: Rect[];
    excerpt: string;
};

export async function createPDFPost(
    props: CommonPostProps & PDFPostProps,
): Promise<ShortQuestionID> {
    // https://github.com/edgedb/edgedb/discussions/3786?sort=top
    const shortId = nanoid();

    const query = e.insert(e.PDFPost, {
        shortId,
        createdAt: e.datetime_of_transaction(),
        title: props.title,
        content: props.content,
        user: e.select(
            e.User,
            user => ({ limit: 1, filter: e.op(user.shortId, "=", props.userId) }),
        ),
        excerptRect: e.insert(e.PDFRect, props.excerptRect),
        rects: e.set(...props.rects.map((r: Rect) => e.insert(e.PDFRect, r))),
        document: e.select(
            e.PDF,
            doc => ({ limit: 1, filter: e.op(doc.shortId, "=", props.document) }),
        ),
        anchorIdx: props.anchorIdx,
        focusIdx: props.focusIdx,
        anchorOffset: props.anchorOffset,
        focusOffset: props.focusOffset,
        page: props.page,
        excerpt: props.excerpt,
    });

    // maybe buggy? (todo: try)
    /*
    const query = e.params({raw_data: e.json}, params =>
	e.for(e.json_array_unpack(params.raw_data), item =>
	  e.insert(e.Movie, {
	    title: e.cast(e.str, item.title),
	  })
	)
      );
      console.log(query.toEdgeQL());
      const result = await query.run(client, {
	raw_data: JSON.stringify([
	  {title: "The Marvels"},
	  {title: "Blade"},
	  {title: "Doctor Strange and the Multiverse of Madness"},
	]),
      });
      */

    // buggy :(())
    // const query = e.params(
    //     { rects: e.array(e.tuple({ x: e.int16, y: e.int16, width: e.int16, height: e.int16 })) },
    //     params =>
    //         e.insert(
    //             e.PDFPost,
    //             {
    //                 shortId,
    //                 createdAt: e.datetime_of_transaction(),
    //                 title: props.title,
    //                 content: props.content,
    //                 score: 0,
    //                 user: e.select(e.User, user => ({ limit: 1, filter: e.op(user.shortId, "=", props.userId) })),
    //                 excerptRect: e.insert(e.PDFRect, props.excerptRect),
    //                 rects: e.for(e.array_unpack(params.rects), item =>
    //                     e.insert(e.PDFRect, {
    //                         x: item.x,
    //                         y: item.y,
    //                         width: item.width,
    //                         height: item.height,
    //                     })),
    //                 document: e.select(e.PDF, doc => ({ limit: 1, filter: e.op(doc.shortId, "=", props.document) })),
    //                 anchorIdx: props.anchorIdx,
    //                 focusIdx: props.focusIdx,
    //                 anchorOffset: props.anchorOffset,
    //                 focusOffset: props.focusOffset,
    //                 page: props.page,
    //                 excerpt: props.excerpt,
    //             },
    //         ),
    // );

    // reportQuery({ edgeql: query.toEdgeQL(), durationMs: 0 });
    await query.run(db);
    // reportQuery({ edgeql: query.toEdgeQL(), durationMs: end - start });
    return shortId as ShortQuestionID;
}
