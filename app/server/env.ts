export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const IS_TEST = process.env.NODE_ENV === "test";
console.log(`IS_PRODUCTION: ${IS_PRODUCTION}`);
console.log(`IS_TEST: ${IS_TEST}`);
