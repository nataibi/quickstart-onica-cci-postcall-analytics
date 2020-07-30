# aws-icc

### Usage:

Setup:
---
```
pipenv shell
pipenv install
./build.sh build --stage <stage-name> --region us-east-1
```

Deploy:
---
```
aws s3 sync . s3://<bucket-name>/<key-prefix>
```

Test:
---
  - run `npm run test` for tests
  - run `npm run coverage` for test coverage
  - run `npm run lint` to check for lint errors



