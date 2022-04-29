#! /usr/bin/env node
require('dotenv').config();
const { EDGEDB_PASSWORD, EDGEDB_HOST, EDGEDB_PORT } = process.env;

const cmd = `echo '${EDGEDB_PASSWORD}' | edgedb -H ${EDGEDB_HOST} -P ${EDGEDB_PORT} --tls-security=insecure --password-from-stdin`
console.log(cmd)