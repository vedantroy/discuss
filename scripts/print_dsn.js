const PG_PORT =     5432;
const PG_USERNAME = "postgres"
const PG_PASS = null
const PG_HOSTNAME = null

const DSN = `postgresql://${PG_USERNAME}:${PG_PASS}@${PG_HOSTNAME}:${PG_PORT}`
console.log(DSN)
