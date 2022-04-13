export function toId(page: number, n: number): string {
    // If selectors start w/ a number we need to use annoying things like
    // CSS.escape
    // https://stackoverflow.com/questions/20306204/using-queryselector-with-ids-that-are-numbers
    return `t${page}-${n}`;
}

export function fromId(id: string): [number, number] {
    const [page, n] = id.split("-");
    return [parseInt(page.slice(1)), parseInt(n)];
}

export function getPageTextId(page: number): string {
    return `page-text-${page}`;
}
