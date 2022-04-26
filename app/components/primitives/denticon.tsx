import { toSvg } from "jdenticon";

type DenticonProps = {
    displayName: string;
    size?: number;
};

export default function({ displayName, size = 32 }: DenticonProps) {
    const svg = toSvg(displayName, size, { backColor: "#fff" });
    return <div dangerouslySetInnerHTML={{ __html: svg }}></div>;
}
