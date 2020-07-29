import 'source-map-support/register'
import { DynamoDB } from 'aws-sdk'
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

const documentClient = new DynamoDB.DocumentClient()

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const queryStringParameters = event.queryStringParameters || {}
  console.log(event.queryStringParameters)
  const { lastKey } = queryStringParameters
  let params: DocumentClient.ScanInput = {
    TableName: process.env.TABLE_NAME,
    ExpressionAttributeNames:{
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":st": 3
    },
    FilterExpression: "#status = :st",
    Limit: 10
  }

  if (lastKey && lastKey !== '') {
    params = {
      ...params,
      ExclusiveStartKey: JSON.parse(lastKey),
    }
  }

  const completedAudio = await documentClient.scan(params).promise()

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      audio: completedAudio.Items,
      lastEvaluatedKey: completedAudio.LastEvaluatedKey || null,
      labels: {
        agentChannel: process.env.AGENT_CHANNEL,
        agentLabel: process.env.AGENT_LABEL
      }
    })
  }
}
