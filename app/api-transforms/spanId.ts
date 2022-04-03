export function toId(page: number, n: number): string {
    // If selectors start w/ a number we need to use annoying things like
    // CSS.escape
    // https://stackoverflow.com/questions/20306204/using-queryselector-with-ids-that-are-numbers
    return `t${page}-${n}`;
}

export function getIdxFromId(id: string): number {
    const [_, n] = id.split("-");
    return parseInt(n);
}
