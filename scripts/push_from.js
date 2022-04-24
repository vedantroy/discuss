#! /usr/bin/env node

const fs = require("fs");
const path = require("path");
const child_process = require("child_process");

const MIGRATION_FOLDER = path.resolve(`${__dirname}/../dbschema/migrations`);
// TODO: Use a config file
const SUB_OPTS = "--tls-security=insecure -P 5656";
const OPTS = `edgedb ${SUB_OPTS}`;

const CONNECT_COMMAND = `${OPTS} list databases`;
try {
    child_process.execSync(CONNECT_COMMAND).toString();
} catch (e) {
    console.error(`Could not connect to DB with command: ${CONNECT_COMMAND}`);
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
    console.error(`stderr: ${error.stderr.toString()}`);
    console.error(`stdout: ${error.stdout.toString()}`);
    process.exit(1);
}

// We can connect to the DB @ this point

const args = process.argv;
const USAGE = `Usage: ${args[1]} <migration number> [--unsafe]`;
if (args.length !== 3 && args.length !== 4) {
    console.error(USAGE);
    process.exit(1);
}

if (args.length === 4 && args[3] !== "--unsafe") {
    console.error(USAGE);
    process.exit(1);
}

const unsafe = args.length === 4;

const fromMigration = args[2] === "latest" ? Infinity : parseInt(args[2]);
if (isNaN(fromMigration)) {
    console.log(`Invalid migration number: ${args[1]}`);
    process.exit(1);
}

const og = child_process.execSync;
child_process.execSync = (...args) => {
    console.log(`Executing: ${args[0]}`);
    return og(...args);
};

try {
    child_process.execSync(`${OPTS} query 'CREATE DATABASE temp'`).toString();
} catch (e) {
    const message = e.message;
    if (!message.includes("DuplicateDatabaseDefinitionError")) {
        throw e;
    } else {
        console.log(`Ignoring duplicate temp database`);
    }
}
child_process
    .execSync(
        `${OPTS} -d temp query 'DROP DATABASE edgedb' ' CREATE DATABASE edgedb'`,
    )
    .toString();
child_process.execSync(`${OPTS} query 'DROP DATABASE temp'`).toString();
child_process.execSync(`${OPTS} migrate`).toString();

console.log("Removing migrations...");
const migrations = fs.readdirSync(MIGRATION_FOLDER);
for (const migration of migrations) {
    const number = migration.slice(0, -".edgeql".length);
    if (number > fromMigration) {
        fs.rmSync(path.join(MIGRATION_FOLDER, migration));
    }
}

const split = SUB_OPTS.split(" ");
let error;

if (unsafe) {
    const r = child_process.spawnSync(
        `edgedb`,
        ["migration", "create", "--non-interactive", "--allow-unsafe", ...split],
        { stdio: "inherit" },
    );
    error = r.error;
} else {
    console.log("USEFUL DEFAULTS:");
    console.log(`select <datetime>'1999-03-31T15:17:00Z'`);
    console.log(`select <uuid>'a5ea6360-75bd-4c20-b69c-8f317b0d2857'`);

    const r = child_process.spawnSync(
        `edgedb`,
        ["migration", "create", ...split],
        { stdio: "inherit" },
    );
    error = r.error;
}
if (error) {
    console.log(error);
    process.exit(1);
}

child_process.execSync(`${OPTS} migrate`).toString();
child_process.execSync(`npx edgeql-js ${SUB_OPTS}`).toString();
