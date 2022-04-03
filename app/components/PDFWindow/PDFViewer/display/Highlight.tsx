import { useState } from "react";
import { Rect } from "../../types";

type HighlightProps = {
    rects: Rect[];
    id: string;
};

const highlight: React.FC<HighlightProps> = ({ rects, id }) => {
    const [active, setActive] = useState(false);

    return (
        <>
            {rects.map(({ x, y, width, height }, i) => (
                <div
                    key={`${id}-${i}`}
                    className="absolute opacity-30 z-10 bg-black"
                    style={{ top: y, left: x, width, height }}
                >
                </div>
            ))}
        </>
    );
};

export default highlight;
