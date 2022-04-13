import React, { useEffect, useState } from "react";

// TODO: Type the ref
export default function useContainerDimensions(myRef: React.RefObject<HTMLElement>) {
    const getDimensions = () => ({
        width: myRef.current!!.offsetWidth,
        height: myRef.current!!.offsetHeight,
    });

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            setDimensions(getDimensions());
        };

        if (myRef.current) {
            setDimensions(getDimensions());
        }

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [myRef]);

    return dimensions;
}
