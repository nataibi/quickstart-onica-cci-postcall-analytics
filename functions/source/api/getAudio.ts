import 'source-map-support/register'
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda'
import { S3 } from 'aws-sdk'
import { HeadObjectRequest } from 'aws-sdk/clients/s3'

const s3 = new S3({ apiVersion: '2006-03-01' })

const extractBucketProps = (uri: string): string[] => [process.env.BUCKET_NAME, uri.replace(`s3://${process.env.BUCKET_NAME}/`, '')]

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const queryStringParameters = event.queryStringParameters || {}
  console.log(queryStringParameters)
  const uri = queryStringParameters.uri
  const [bucket, key] = extractBucketProps(decodeURIComponent(uri))

  const baseParams: HeadObjectRequest = {
    Bucket: bucket,
    Key: key,
  }
  const data = await s3.headObject(baseParams).promise()
  const response = s3.getSignedUrl('getObject', {
    ...baseParams,
    Expires: 600
  })

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },    
    body: JSON.stringify({
      uri: response,
      contentType: data.ContentType
    })
  }
}
