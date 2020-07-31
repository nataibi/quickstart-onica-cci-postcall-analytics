# Build artifacts

### Usage:

Setup:
---
From the root of the repository, run the following commands:

```
pipenv shell
pipenv install
./assets/scripts/build.sh build --stage <stage-name> --region us-east-1
```

Stage: 
---
Stage only required files to s3://<bucketname>/<keyprefix>/

```
aws s3 sync . s3://quickstart-onica-dev-pca/icc-pca --exclude "functions/source/.serverless/*" --exclude "functions/source/node_modules/*" --exclude "assets/portal/node_modules/*" --exclude "assets/portal/*" --include "assets/portal/build/*" --exclude "assets/scripts/*" --exclude ".git/*"
```

Test:
---
  - run `npm run test` for tests
  - run `npm run coverage` for test coverage
  - run `npm run lint` to check for lint errors



