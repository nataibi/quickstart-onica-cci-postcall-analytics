import 'source-map-support/register'
import { DynamoDB } from 'aws-sdk'
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda'
import middy from 'middy'
import { cors } from 'middy/middlewares'
import axios from 'axios'

const documentClient = new DynamoDB.DocumentClient()

export const updateStatus: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const body = JSON.parse(event.body)
  const jobId = body.jobId
  const uris = body.uris

  const TOKEN_ENDPOINT = process.env.TOKEN_ENDPOINT.replace('region', process.env.AWS_REGION)
  const token = event.headers['Authorization']

  const user = await axios({
    method: 'GET',
    url: TOKEN_ENDPOINT,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  console.log(jobId)
  console.log(uris)

  const response = await documentClient.batchWrite({
    RequestItems: {
      [process.env.TABLE_NAME]: uris.map(uri => ({
        PutRequest: {
          Item: {
            jobId: uri.jobId,
            audioURI: uri.uri,
            status: 0,
            user: user.data.email,
            userName: user.data.username,
            lastModified: uri.lastModified
          }
        }
      }))
    }
  }).promise()

  console.log(response)

  return {
    statusCode: 200,
    body: JSON.stringify(uris)
  }
}

export const handler = middy(updateStatus).use(cors())