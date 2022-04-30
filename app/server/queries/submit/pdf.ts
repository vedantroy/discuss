import { nanoid } from "nanoid";
import { Rect } from "~/components/PDFWindow/types";
import db, { e } from "~/server/edgedb.server";
import { CommonPostProps, ShortDocumentID, ShortQuestionID } from "../common";

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
        rects: e.set(...props.rects.map(r => e.insert(e.PDFRect, r))),
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
