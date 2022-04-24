import * as fs from "fs";
import { nanoid } from "nanoid";

type Report = {
    edgeql: string;
    durationMs: number;
};

export function reportQuery({ edgeql, durationMs }: Report) {
    const id = nanoid();
    const schema = fs.readFileSync(`./dbschema/default.esdl`).toString();

    const text = `
## Time
${durationMs}ms

## Query
\`\`\`
${edgeql}
\`\`\`

## Schema
\`\`\`
${schema}
\`\`\`
`;

    fs.writeFileSync(`./report-${id}.md`, text);
}
