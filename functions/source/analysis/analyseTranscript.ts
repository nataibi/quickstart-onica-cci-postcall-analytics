import { S3Event, Context } from 'aws-lambda'
import { Comprehend, S3, DynamoDB, SNS } from 'aws-sdk'
import template from './template'

const s3 = new S3({ apiVersion: '2006-03-01' })
const sns = new SNS()
const comprehend = new Comprehend();
const documentClient = new DynamoDB.DocumentClient()

type S3Params = {
  name: string;
  key: string;
  size: number;
  format?: string;
  numberOfChannels?: number;
}

const CHUNK_SIZE = 5000
const NEGATIVE_SENTIMENT_THRESHOLD = 0.4
const POSITIVE_SENTIMENT_THRESHOLD = 0.6

const threatRegex = /(kill)\s(your)(self|selves)|(kill)\s(them|him|her)|(commit)\s(suicide)|(I)\s(hope)\s(you|she|he|they)\s*(die)s?/gi

const extractBucketParams = (event: S3Event): S3Params[] => event.Records
  .map(({ s3 }) => ({
    name: s3.bucket.name,
    key: s3.object.key,
    size: s3.object.size
  }))

const merge = (arr) => {
    let merged = [{"ResultList": [] }]
    arr.forEach(item => {
        merged["ResultList"] = merged[0].ResultList.push(...item.ResultList)
    })
    return merged;
}

const getDominantSentiments = (response) => {
    let merged = [].concat(...merge(response))
    let dominantSentiments = []

    merged[0].ResultList.forEach( turn => {
        dominantSentiments.push(getDominantScore(turn))
    })

    return dominantSentiments
}

const getDominantScore = (turn) => {
    let dominantSentiment = { Sentiment: "", SentimentScore: 0.0 }

    if(turn.SentimentScore.Negative > NEGATIVE_SENTIMENT_THRESHOLD && turn.SentimentScore.Positive > POSITIVE_SENTIMENT_THRESHOLD){
        if(turn.SentimentScore.Negative > turn.SentimentScore.Positive){
            dominantSentiment = { Sentiment: "NEGATIVE", SentimentScore: turn.SentimentScore.Negative }
        }else {
            dominantSentiment = { Sentiment: "POSITIVE", SentimentScore: turn.SentimentScore.Positive }
        }
    }
    else if(turn.SentimentScore.Negative > NEGATIVE_SENTIMENT_THRESHOLD){
        dominantSentiment = { Sentiment: "NEGATIVE", SentimentScore: turn.SentimentScore.Negative }
    }
    else if(turn.SentimentScore.Positive > POSITIVE_SENTIMENT_THRESHOLD) {
        dominantSentiment = { Sentiment: "POSITIVE", SentimentScore: turn.SentimentScore.Positive }
    }
    else {
        if(turn.SentimentScore.Negative > turn.SentimentScore.Positive){
            dominantSentiment = { Sentiment: "NEGATIVE", SentimentScore: turn.SentimentScore.Negative }
        }else {
            dominantSentiment = { Sentiment: "POSITIVE", SentimentScore: turn.SentimentScore.Positive }
        }
    }

    return dominantSentiment
}

const doChunk =(str: String, len: Number) => {
    let input = str.trim().split(' ');
    let [index, output] = [0, []]
    output[index] = '';
    input.forEach(word => {
        let temp = `${output[index]} ${word}`.trim()
        if (temp.length <= len) {
            output[index] = temp;
        } else {
            index++;
            output[index] = word;
        }
    })
    return output
}

const chunkDocuments = (paragraph:String, chunk_size=CHUNK_SIZE) => {
    paragraph = paragraph.replace("|","")
    return doChunk(paragraph,chunk_size)
}

const chunks = (paragraph:String, chunk_size=CHUNK_SIZE) => {
    const textList = []
    const paragraphTurns = paragraph.split('|').filter(e=>e.trim())
    paragraphTurns.forEach(turn => {
        textList.push(doChunk(turn,chunk_size))
    })
    return textList
}

const getDominantClass = (status) => {
    return status.Classes.reduce((a,b) => (a.Score > b.Score) ? a : b)
}

const getSpeaker = (turn) => turn.hasOwnProperty('channel') ? turn.channel : turn.speaker_label

const getSplit = (json, agentChannel) => {
    const turns = json.turns
    const customerChannel = agentChannel === 0 ? 1 : 0
    const agent = turns.filter(turn => getSpeaker(turn) === agentChannel)
    .map(turn => turn.text).join('|')
    const customer = turns.filter(turn => getSpeaker(turn) === customerChannel).map(turn => turn.text).join('|')
    return [agent, customer]
}

export const handler = async (event: S3Event, context: Context) => {
    const region = process.env.AWS_REGION
    const accountId = context.invokedFunctionArn.split(':')[4]
    const resolutionEndpointArn = process.env.CALL_RESOLUTION_ENDPOINT_ARN.replace('region', region).replace('account-id', accountId)
    const motivationEndpointArn = process.env.CALL_MOTIVATION_ENDPOINT_ARN.replace('region', region).replace('account-id', accountId)
    try {
        const objectParams = extractBucketParams(event)
        const meta = await s3.headObject({
            Bucket: objectParams[0].name,
            Key: objectParams[0].key
        }).promise()
        const objectPath = `s3://${objectParams[0].name}/${objectParams[0].key}`
        console.log("1: object path" +  objectPath)
        const assetId = objectParams[0].key.split('/').slice(-1)[0].split('.')[0];

        const s3Response = await s3.getObject({
            Bucket: objectParams[0].name,
            Key: objectParams[0].key
        }).promise();

        console.log("2: s3 response from get" +  JSON.stringify(s3Response))


        const transcriptText = s3Response.Body.toString('utf-8');
        const turns = JSON.parse(transcriptText);
        const agentChannel = parseInt(turns.numChannels === 2 ? process.env.AGENT_CHANNEL : process.env.AGENT_LABEL)
        const customerChannel = agentChannel === 0 ? 1 : 0
        const [agentTranscript, customerTranscript] = getSplit(turns, agentChannel)

        console.log("3: checking for threatening language...")

        // check for threatening language
        const customerMatches = (customerTranscript || '').split('|').filter(turn => turn.match(threatRegex))
        // if a match is found send the turn where the threat occurred
        if (customerMatches.length > 0) {
            await sns.publish({
                Subject: 'Threatening caller',
                Message: `A caller has been flagged for threatening language: ${customerMatches.join('. ')}`,
                TopicArn: process.env.TOPIC_ARN
            }).promise()
        }



        let agentTranscriptChunks = chunks(agentTranscript)
        let customerTranscriptChunks = chunks(customerTranscript)

        const agentParams = {
            TextList: [].concat(...chunkDocuments(agentTranscript.replace("|",""))),
             LanguageCode: "en"
        }

        const customerParams = {
            TextList: [].concat(...chunkDocuments(customerTranscript.replace("|",""))),
             LanguageCode: "en"
        }

        const callResolutionEndpointResult = await comprehend.describeEndpoint({
            EndpointArn: resolutionEndpointArn
        }).promise()
        const calMotivationEndpointResult = await comprehend.describeEndpoint({
            EndpointArn: motivationEndpointArn
        }).promise()

        const callResolutionEnpointProps = callResolutionEndpointResult.EndpointProperties
        const callMotivationEndpointProps = calMotivationEndpointResult.EndpointProperties

        console.log("4: entities and key phrases...")

        // run text analysis in parallel
        const [agentEntities, customerEntities, agentKeyPhrases, customerKeyPhrases,
        ] = await Promise
        .all([
            comprehend.batchDetectEntities(agentParams).promise(),
            comprehend.batchDetectEntities(customerParams).promise(),
            comprehend.batchDetectKeyPhrases(agentParams).promise(),
            comprehend.batchDetectKeyPhrases(customerParams).promise(),
        ])
        
        let callResolutionStatus = "UNDETERMINED"
        let callMotivationStatus = "UNDETERMINED"

        console.log("5: classifying...")

        
        if(callResolutionEnpointProps.Status === "IN_SERVICE") {
            console.log("classifying document by call resolution classifer...")
            const crStatus = await comprehend.classifyDocument({
                EndpointArn: resolutionEndpointArn,
                Text: customerTranscriptChunks.slice(-3).join(' ')
            }).promise()
            callResolutionStatus = getDominantClass(crStatus).Name
        }
        if(callMotivationEndpointProps.Status === "IN_SERVICE") {
            console.log("classifying document by call motivation classifer...")
            const cmStatus = await comprehend.classifyDocument({
                EndpointArn: motivationEndpointArn,
                Text: customerTranscriptChunks.slice(0, 3).join(' ')
            }).promise()
            callMotivationStatus = getDominantClass(cmStatus).Name
        }
        
        let agentSentimentBatchResponse = []
        let customerSentimentBatchResponse = []

        while(agentTranscriptChunks.length !== 0) {
            const textList = ([].concat(...agentTranscriptChunks)).slice(0,25)
            if(textList.length !== 0) {
                agentSentimentBatchResponse.push(await comprehend.batchDetectSentiment({
                    TextList: textList,
                    LanguageCode: "en"
                }).promise())
                agentTranscriptChunks = agentTranscriptChunks.slice(25)
            }
        }
        
        while(customerTranscriptChunks.length !== 0) {
            const textList = ([].concat(...customerTranscriptChunks)).slice(0,25)
            if(textList.length !== 0) {
                customerSentimentBatchResponse.push(await comprehend.batchDetectSentiment({
                    TextList: textList,
                    LanguageCode: "en"
                }).promise())
                customerTranscriptChunks = customerTranscriptChunks.slice(25)
            }
       }
       
        //agent sentiment parts
        const agentSentiment = getDominantSentiments(agentSentimentBatchResponse)

        //customer sentiment parts
        const customerSentiment = getDominantSentiments(customerSentimentBatchResponse)

        turns.turns.filter(t => t.channel == customerChannel || t.speaker_label == customerChannel)
        .map( (t,i) => t.sentiment = customerSentiment[i])
        turns.turns.filter(t => t.channel == agentChannel || t.speaker_label == agentChannel)
        .map( (t,i) => t.sentiment = agentSentiment[i])
        
        const analysisResponse = 
        template.replace("<AssetId>",JSON.stringify(assetId))
        .replace("<Turns>",JSON.stringify(turns.turns))
        .replace("<CustomerEntities>",JSON.stringify(customerEntities.ResultList.filter(item => item.Entities.length != 0), null))
        .replace("<CustomerKeyPhrases>",JSON.stringify(customerKeyPhrases.ResultList.filter(item => item.KeyPhrases.length != 0), null))
        .replace("<AgentEntities>",JSON.stringify(agentEntities.ResultList.filter(item => item.Entities.length != 0), null))
        .replace("<AgentKeyPhrases>",JSON.stringify(agentKeyPhrases.ResultList.filter(item => item.KeyPhrases.length != 0), null))
        .replace("<CallResolutionStatus>",JSON.stringify(callResolutionStatus))
        .replace("<CallMotivationStatus>",JSON.stringify(callMotivationStatus))

        //push to s3
        const uploadParams = {
            Bucket: process.env.TEXT_ANALYSIS_OUTPUT_BUCKET,
            Key: assetId+".json",
            Body: analysisResponse
        }
        const uploadReq = await s3.putObject(uploadParams).promise();

        console.log(`Searching for ${decodeURIComponent(objectPath)}`)
        const existingFiles = await documentClient.query({
            TableName: process.env.TABLE_NAME,
            ExpressionAttributeValues: {
                ':j': meta.Metadata.jobid,
                ':l': meta.Metadata.lastmodified
            },
            KeyConditionExpression: 'jobId = :j and lastModified = :l'
        }).promise()

        console.log(existingFiles)

        // update table to reflect
        const tableUpdates = await documentClient.update({
            TableName: process.env.TABLE_NAME,
            Key: {
                jobId: existingFiles.Items[0].jobId,
                lastModified: existingFiles.Items[0].lastModified
            },
            ExpressionAttributeNames: {
              '#status': 'status',
              '#analysisURI': 'analysisURI'
            },
            ExpressionAttributeValues: {
              ':st': 3,
              ':au': `s3://${uploadParams.Bucket}/${uploadParams.Key}`
            },
            UpdateExpression: 'set #status = :st, #analysisURI = :au',
            ReturnValues: 'ALL_NEW'
        }).promise()

        console.log(tableUpdates)

        return uploadReq;

    } catch (error) {
        console.error('Failed:',error);
        throw error
    }
}
