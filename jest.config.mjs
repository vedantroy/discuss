// This is magic but for some reason
// using jest.config.mjs worked but jest.config.js didn't
import hq from "alias-hq";

const config = {
    moduleDirectories: ["node_modules", "<rootDir>/"],
    testEnvironment: "jest-environment-jsdom",
    setupFilesAfterEnv: [],
    testMatch: ["**/?(*.)+(spec|test).(js|ts)?(x)"],
    transform: {
        "^.+\\.js$": ["esbuild-jest"],
        "^.+\\.tsx?$": [
            "esbuild-jest",
            {
                sourcemap: true,
                loaders: {
                    ".test.ts": "tsx",
                },
            },
        ],
    },
    moduleNameMapper: hq.get("jest"),
};
export default config;
