import { useState } from "react";
import { Rect } from "../../types";

type HighlightProps = {
    rects: Rect[];
    id: string;
    active: boolean;
};

const highlight: React.FC<HighlightProps> = ({ rects, id, active }) => {
    return (
        <>
            {rects.map(({ x, y, width, height }, i) => (
                <div
                    // don't want the order to change ..
                    key={i}
                    className={`absolute bg-black z-10 ${active ? `opacity-50` : `opacity-10`}`}
                    style={{ top: y, left: x, width, height, pointerEvents: "all" }}
                >
                </div>
            ))}
        </>
    );
};

export default highlight;
