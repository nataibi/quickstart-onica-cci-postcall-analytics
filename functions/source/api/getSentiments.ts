import 'source-map-support/register'
import { S3 } from 'aws-sdk'
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { GetObjectRequest } from 'aws-sdk/clients/s3';

const s3 = new S3({ apiVersion: '2006-03-01' })

const extractBucketProps = (uri: string): string[] => [process.env.BUCKET, uri.replace(`s3://${process.env.BUCKET}/`, '')]

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    const queryStringParameters = event.queryStringParameters || {}
    console.log(queryStringParameters)
    const uri = queryStringParameters.uri
    const [bucket, key] = extractBucketProps(decodeURIComponent(uri))
    console.log(key)
    
    const baseParams: GetObjectRequest = {
        Bucket: bucket,
        Key: key,
    }
    const data = await s3.getObject(baseParams).promise()
    
    return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },    
        body: JSON.stringify({
          uri: data.Body.toString(),
        })
    }
};
