// https://stackoverflow.com/questions/36862334/get-viewport-window-height-in-reactjs
import { useEffect, useState } from "react";

type Dimensions = { width: number; height: number };
function getWindowDimensions(): Dimensions {
    if (typeof window !== "undefined") {
        const { innerWidth: width, innerHeight: height } = window;
        return {
            width,
            height,
        };
    }
    return { width: -1, height: -1 };
}

export default function useWindowDimensions(): Dimensions {
    const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

    useEffect(() => {
        function handleResize() {
            setWindowDimensions(getWindowDimensions());
        }

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return windowDimensions;
}
