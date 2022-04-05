export type PostHighlight = {
    id: string;
    text: string;
    page: number;
    anchorId: string;
    focusId: string;
    anchorOffset: number;
    focusOffset: number;
};

export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
