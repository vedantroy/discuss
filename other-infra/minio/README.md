Guide: https://fly.io/docs/app-guides/minio/

Create a storage volume with:
```
// default region is ord
fly vol create miniodata --region ${region}
```

We need 2 secrets:
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=