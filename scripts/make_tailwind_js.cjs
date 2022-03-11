// Re-run this whenever you change tailwind.config.js
const fs = require("fs");
const _ = require("lodash");
const resolveConfig = require("tailwindcss/resolveConfig");
const tailwindConfig = require("../tailwind.config");

const fullConfig = resolveConfig(tailwindConfig);
const defaultValue = Symbol("default");

function strip(paths) {
    const config = {};
    for (const path of paths) {
        const prop = _.get(fullConfig, path, defaultValue);
        if (prop === defaultValue) {
            throw new Error(`Could not find path: ${path}`);
        }
        // So "x.8" sets "8" as a string key
        // https://lodash.com/docs/4.17.15#setWith
        _.setWith(config, path, prop, Object);
    }
    return config;
}

const configTreeShaked = strip(["theme.height.8"]);

const config = `export default ${JSON.stringify(configTreeShaked, null, 2)}`;
// const config = `export default ${JSON.stringify(fullConfig, null, 2)}`;
fs.writeFileSync("./app/styles/config.ts", config);
