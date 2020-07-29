# aws-icc

### Usage:

Setup:
---
```
pipenv shell
pipenv install
./build.sh build --stage prod --region us-east-1 --bucket aws-icc-host-prod
```

Deploy:
---

 - The environment is set using an environment variable `DEPLOY_ENVIRONMENT`
 - To run the deployment use `DEPLOY_ENVIRONMENT=my_env ./deploy.sh`
 - This namespaces all infrastructure with the environment

Test:
---
 - From `/aws-icc`
  - run `npm run test` for tests
  - run `npm run coverage` for test coverage
  - run `npm run lint` to check for lint errors

Automation:
---

 - There is an included pre-commit
  - Move this to the `.git/hooks` folder to take advantage of the hooks
 - There is an included commit.template
  - Run `git config --local commit.template "./commit.template"`
  - Or add the following line to `.git/config`:
```
[commit]
    template = ./commit.template
```
