# Managing s3 buckets for s3-db

`s3-db` manages a bucket per environment, per table.
e.g.: `qcic.test-alarms` or `qcic.production-objects`.

The access key we create has permisions on all the `qcic*` buckets

## TODO
- make `keyrotation.sh` script

## S3 permission related operations
These key management operations are done using a more privileged user (im-dan)

### Setup
- Create user, acces-key s3 policy, attach to user
```
./setup.sh
```

### Status
```
./status
```

### Rotating keys
Not yet done

### Teardown
- detach policy from user, delete policy, access key, user
```
./teardown.sh
```

## Playground snippets

### Bucket creation and operations
This is to create bucket with correct policy. 
- create user `im-qcic-s3-rw`
 - with policy: s3:* on `arn:aws:s3:::qcic-*/*`

- Bucket creation is done with a user profile
  - Which uses it's default region
- Create and rotate operation credential with second cmmand

```
# Create user:
aws --profile im-dan iam create-user --user-name qcic-s3-rw

# List Users:
aws --profile im-dan iam list-users

# Delete user
aws --profile im-dan iam delete-user --user-name qcic-s3-rw

# Create access key (store under profile im-qcic-s3-rw)
aws --profile im-dan iam create-access-key --user-name qcic-s3-rw

## Check permissions
# Create bucket
aws --profile im-qcic-s3-rw s3 mb s3://qcic.test

# List buckets
aws --profile im-qcic-s3-rw s3 ls

# Delete bucket
aws --profile im-qcic-s3-rw s3 rb s3://qcic.test
```

# Create policy
```
# List attached policies
aws --profile im-dan iam list-attached-user-policies --user-name qcic-s3-rw
aws --profile im-dan iam detach-user-policy --user-name qcic-s3-rw --policy-arn arn:aws:iam::123517053355:policy/qcic-s3-rw

```
Allows all oprations on qcic prefixed buckets as well as objects

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "1",
            "Effect": "Allow",
            "Action": [
                "s3:ListAllMyBuckets",
                "s3:HeadBucket",
                "s3:ListObjects"
            ],
            "Resource": "*"
        },
        {
            "Sid": "2",
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::qcic*/*",
                "arn:aws:s3:::qcic*"
            ]
        }
    ]
}
```
