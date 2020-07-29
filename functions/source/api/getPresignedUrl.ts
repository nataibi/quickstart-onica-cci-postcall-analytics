import { APIGatewayProxyHandler } from 'aws-lambda'
import 'source-map-support/register'
import { S3 } from 'aws-sdk'
import v4 from 'uuid/v4'
import axios from 'axios'

const s3 = new S3({ apiVersion: '2006-03-01' })

const getPresignedResponse = (params, file) => ({
  url:  s3.getSignedUrl('putObject', params),
  name: file.name,
  Bucket: params.Bucket,
  Key: params.Key,
  lastModified: file.lastModified,
  jobId: file.jobId
})

export const handler: APIGatewayProxyHandler = async (event) => {
  const { files } = JSON.parse(event.body)

  const TOKEN_ENDPOINT = process.env.TOKEN_ENDPOINT.replace('region', process.env.AWS_REGION)
  const token = event.headers['Authorization']

  const user = await axios({
    method: 'GET',
    url: TOKEN_ENDPOINT,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  const response = files.map(file => getPresignedResponse({
      Bucket: process.env.BUCKET_NAME,
      Key: `Audio-${v4()}.${file.name}`,
      ContentType: file.type,
      Metadata: {
        jobId: file.jobId,
        user: JSON.stringify(user.data.email),
        lastModified: file.lastModified
      },
    }, file))

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(response)
  }
}
