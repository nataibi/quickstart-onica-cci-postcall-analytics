REGION=$(cat ./runway.yml | grep -o 'us-.*-[0-9]')
ENV=$DEPLOY_ENVIRONMENT
export CUSTOM_VOCABULARY_NAME="custom-vocabulary"
export REGION=$REGION
echo "Deploying to: $REGION"
# deploy infrastructure
./runway deploy
if [ $? -eq 0 ]; then
    echo 'Deploy Sucess'
else
    echo 'Deploy Failed aborting uploads'
    exit $?
fi

# get output
# SLS_OUTPUT=$(sls print)

# deploy UI
cd aws-icc
# build
echo "Environment $ENV"
if [ "$ENV" = "production" ]; then
    echo "Building for production"
    npm run build:web:prod
else
    echo "Building for development"
    npm run build:web:dev
fi
serverless client deploy --no-confirm
