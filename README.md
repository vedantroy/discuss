# Infrastructure
## EdgeDB
### AWS

- Run AWS Aurora Postgres (or AWS RDS Postgres)
- Run a EC2 instance with EdgeDB that connects to the Postgres instance
  - The EC2 instance should have at least 1GB of memory, if you use 0.5 GB then there _may_ be a mysterious connection refused error
- Catches
  - Make the DB & the instance in the same VPC
  - The DB should have in-bound / out-bound traffic on 5432 (Postgres default port)
    - Same with the EC2 instance
  - To check if the EC2 instance has access to the Postgres instance:
    - `telnet <postgres hostname> 5432`
  - Get an AWS elastic IP & assign it for the proxy
### Server Config

- Follow the [bare metal](https://www.edgedb.com/docs/guides/deployment/bare_metal) guide
- Get the PG connection string with:
  ```
  `postgresql://${PG_USERNAME}:${PG_PASS}@${PG_HOSTNAME}:${PG_PORT}`
  ```
- Run `edgedb server info --latest` to get the location to the server binary
- Run the following to start the edgedb server WITHOUT auth

```
# The quotes are important
EDGEDB_SERVER_BACKEND_DSN='<your postgres connection string>'
# Example path/to/server /home/ubuntu/.local/share/edgedb/portable/1.3/bin/edgedb-server
path/to/server --backend-dsn $EDGEDB_SERVER_BACKEND_DSN --tls-cert-mode generate_self_signed --tls-cert-file ./tls_cert --tls-key-file ./tls_key -I 0.0.0.0  --default-auth-method Trust
```

- If you are using TLS, then copy the tls_cert file from the proxy to your local machine (I'll call the copy `tls_cert_local` for clarity)
- To set a database password
  - Connect using `edgedb -H {ip address} -P 5656 --tls-security=no_host_verification --tls-ca-file ./tls_cert_local`
    - We need no_host_verification since elastic IPs don't have hostnames
  - Use an edgedb client and run `alter role edgedb set password := "YOUR_EDGE_DB_PASSWORD";`
- Now run the above command again _without_ `--default-auth-method Trust` to force password authentication
- If you aren't using TLS you can remove the `--tls-cert-file` and `--tls-key-file` options and use `--tls-security=insecure` on the client

## Storage
We're using minIO on fly.io for S3 storage