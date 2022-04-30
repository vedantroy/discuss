#! /usr/bin/env node

// This script hangs & stuff -- idk why
const child_process = require("child_process");
require("dotenv").config();

const envVars = [
    "COOKIE_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "EDGEDB_PASSWORD",
    "EDGEDB_HOST",
];
for (const envVar of envVars) {
    console.log(`Running for: ${envVar}`);
    const value = process.env[envVar];
    if (!value) {
        console.error(`Missing environment variable: ${envVar}`);
    }
    // the quote is important ...
    const command = `fly secrets set ${envVar}='${value}'`;
    console.log(`Executing: ${command}`);
    let out = null;
    try {
        out = child_process.execSync(command).toString();
    } catch (e) {
        const { message } = e;
        if (message.includes("No change detected to secrets")) {
            console.log(`No change detected for: ${envVar}`);
            continue;
        }
        throw e;
    }
    console.log(out);
}

console.log("DONE");
