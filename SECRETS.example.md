# Administration
- Most secrets are set using the `fly secrets` command
- Some must be manually set in shell script on the edgedb server
- Some are set in the AWS RDS UI
- You can also store the secrets in a .env file, for use with scripts in scripts/
  - The production server will not use these secrets
# Secrets
## AWS Aurora Postgres
- PG_PASSWORD
- PG_HOST
- PG_URL='postgresql://postgres:${PG_PASSWORD}@${PG_HOST}:5432'

## AWS Edge DB EC2 PEM
```
-----BEGIN RSA PRIVATE KEY-----
// RSA key here
-----END RSA PRIVATE KEY-----
```

## Remix Secrets
- COOKIE_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- EDGEDB_PORT=5656
- EDGEDB_PASSWORD
- EDGEDB_HOST
  - Prefer the domain name version?

## MinIO Secrets
- MINIO_ROOT_USER
- MINIO_ROOT_PASSWORD