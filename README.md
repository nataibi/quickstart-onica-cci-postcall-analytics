# aws-icc

### Usage:

Setup:
---
```
pipenv shell
pipenv install
./build.sh build --stage <stage-name> --region us-east-1
```

Deploy: deploy only important files
---
```
aws s3 sync . s3://quickstart-onica-dev-pca/icc-pca --exclude "functions/source/.serverless/*" --exclude "functions/source/node_modules/*" --exclude "assets/portal/node_modules/*" --exclude "assets/portal/*" --include "assets/portal/build/*" --exclude "assets/scripts/*" --exclude ".git/*"
```

Test:
---
  - run `npm run test` for tests
  - run `npm run coverage` for test coverage
  - run `npm run lint` to check for lint errors



