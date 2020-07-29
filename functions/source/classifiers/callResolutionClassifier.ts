import { S3Event } from 'aws-lambda'
import { Comprehend } from 'aws-sdk'


const comprehend = new Comprehend();

type S3Params = {
    name: string;
    key: string;
  }
  

const extractBucketParams = (event: S3Event): S3Params[] => event.Records
  .map(({ s3 }) => ({
    name: s3.bucket.name,
    key: s3.object.key,
  }))

export const handler = async (event: S3Event) => {
    console.log("creating call resolution classifier...")
    try {
        const objectParams = extractBucketParams(event)

        var createCallResolutionClassifierParams = {
            DataAccessRoleArn: process.env.DATA_ACCESS_ROLE, 
            DocumentClassifierName: process.env.CLASSIFIER_NAME,
            InputDataConfig: {
            S3Uri: `s3://${process.env.CALL_RESOLUTION_BUCKET}/${objectParams[0].key}`
            },
            LanguageCode: 'en'
        };

        await comprehend.createDocumentClassifier(createCallResolutionClassifierParams).promise()
        .then( data => {
            console.log(`classifier created successfully with arn: ${data.DocumentClassifierArn}`)
        })
    } catch (error) {
      //if ResourceInUseException continue
      if(error.code === 'ResourceInUseException'){}
      else{
        console.error('Failed:',error);
        throw error
      }
    }
}