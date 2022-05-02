Guide: https://fly.io/docs/app-guides/minio/

Create a storage volume with:

```
// default region is ord
fly vol create miniodata --region ${region}
```

We need 2 secrets:
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=

## minio client guide / setup

- `mc alias set ${alias name} ${minio url}`
  - Use an HTTPS url, otherwise you get a 301
- Create a bucket called `chimu/pdf`
  - Don't make the bucket public
- Add a readwrite policy
