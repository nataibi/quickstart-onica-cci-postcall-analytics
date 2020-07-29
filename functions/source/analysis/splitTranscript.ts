import { S3Event } from 'aws-lambda'
import { S3, DynamoDB } from 'aws-sdk'


const s3 = new S3({ apiVersion: '2006-03-01' })
const documentClient = new DynamoDB.DocumentClient()

type S3Params = {
  name: string;
  key: string;
  size: number;
  format?: string;
  numberOfChannels?: number;
}

export const extractBucketParams = (event: S3Event): S3Params[] => event.Records
  .map(({ s3 }) => ({
    name: s3.bucket.name,
    key: s3.object.key,
    size: s3.object.size
  }))

export const getTurns = (json) => {
    let channelZero, channelOne
    if (json.results.channel_labels) {
      channelZero = json.results.channel_labels.channels[0].items.map(item => ({ ...item, channel: 0 }))
      channelOne = json.results.channel_labels.channels[1].items.map(item => ({ ...item, channel: 1 }))
    } else {
      const items = json.results.items
      const segments = json.results.speaker_labels.segments
        .reduce((all, segment) => all.concat(segment.items), [])
        .map(segment => ({
          ...segment,
          ...(items.find(item => item.start_time === segment.start_time && item.end_time === segment.end_time) || {})
        }))
      channelZero = segments.filter(segment => segment.speaker_label === 'spk_0').map(item => ({ ...item, speaker_label: 0 }))
      channelOne = segments.filter(segment => segment.speaker_label === 'spk_1').map(item => ({ ...item, speaker_label: 1 }))
    }
    const concatted = channelZero.concat(channelOne)
    let combined = concatted.map((word, i) => {
      if (!word.start_time) return { ...word, start_time: concatted[i - 1].start_time }
      else return word
    })
    combined.sort((a, b) => parseFloat(a.start_time) - parseFloat(b.start_time))

    let labeledByTurn
    if (combined[0].hasOwnProperty('speaker_label')) {
        labeledByTurn = combined.reduce((labeled, word) => {
            const last = labeled[labeled.length - 1]
            if (labeled.length === 0) {
              return labeled.concat({ ...word, turn: 0 })
            }
            if (last.speaker_label !== word.speaker_label) {
              return labeled.concat({ ...word, turn: last.turn + 1 })
            }
            return labeled.concat({ ...word, turn: last.turn })
        }, [])
    } else {
        labeledByTurn = combined.reduce((labeled, word) => {
            const last = labeled[labeled.length - 1]
            if (labeled.length === 0) {
              return labeled.concat({ ...word, turn: 0 })
            }
            if (last.channel !== word.channel) {
              return labeled.concat({ ...word, turn: last.turn + 1 })
            }
            return labeled.concat({ ...word, turn: last.turn })
        }, [])
    }
    const turns = labeledByTurn.reduce((turns, word) => ({
      ...turns,
      [word.turn]: turns[word.turn] ? turns[word.turn].concat(word) : [word]
    }), {})
    let flattenedTurns
    if (combined[0].hasOwnProperty('speaker_label')) {
        flattenedTurns = Object.keys(turns).map(key => ({
            turn: key,
            text: turns[key].map(word => word.alternatives[0].content).join(' ').replace(/\s+(\W)/g, '$1'),
            start_time: turns[key][0].start_time,
            speaker_label: turns[key][0].speaker_label
          }))
    } else {
        flattenedTurns = Object.keys(turns).map(key => ({
            turn: key,
            text: turns[key].map(word => word.alternatives[0].content).join(' ').replace(/\s+(\W)/g, '$1'),
            start_time: turns[key][0].start_time,
            channel: turns[key][0].channel
          }))
    }
    return {
        numChannels: json.results.channel_labels ? 2 : 1,
        turns: flattenedTurns
    }
}

//split out transcript into customer and agent for easy analysis

export const handler = async (event: S3Event) => {
  // get paths for created objects
    try {
        const objectParams = extractBucketParams(event)
        const objectKey = `${objectParams[0].key}`
        console.log(objectKey)

        //Fetch transcript
        const s3Response = await s3.getObject({
            Bucket: objectParams[0].name,
            Key: objectParams[0].key
        }).promise();

        const transcriptText = s3Response.Body.toString('utf-8');
        const transcriptJson = JSON.parse(transcriptText);
        
        const speakerJson = getTurns(transcriptJson)

        const existingFiles = await documentClient.query({
            ExpressionAttributeValues: {
              ':t' : decodeURIComponent(objectKey)
            },
            KeyConditionExpression: 'transcriptionJobName = :t',
            TableName: process.env.TABLE_NAME,
            IndexName: 'jobStatusGSI'
        }).promise()
        console.log(existingFiles)

        const uploadParams = {
            Bucket: process.env.SPLIT_TRANSCRIPT_OUTPUT_BUCKET,
            Key: objectParams[0].key,
            Body: JSON.stringify(speakerJson),
            Metadata: {
                jobId: existingFiles.Items[0].jobId,
                lastModified: existingFiles.Items[0].lastModified
            }
        }
        const uploadReq = await s3.putObject(uploadParams).promise();

        console.log(`Searching for ${decodeURIComponent(objectKey)}`)

        // update table to reflect
        const tableUpdates = await documentClient.update({
            TableName: process.env.TABLE_NAME,
            Key: {
                jobId: existingFiles.Items[0].jobId,
                lastModified: existingFiles.Items[0].lastModified
            },
            ExpressionAttributeNames: {
              '#status': 'status',
              '#transcriptURI': 'transcriptURI',
              '#fullTranscriptURI': 'fullTranscriptURI'
            },
            ExpressionAttributeValues: {
              ':st': 2,
              ':tu': `s3://${uploadParams.Bucket}/${uploadParams.Key}`,
              ':ftu': `s3://${objectParams[0].name}/${objectParams[0].key}`
            },
            UpdateExpression: 'set #status = :st, #fullTranscriptURI = :ftu, #transcriptURI = :tu',
            ReturnValues: 'ALL_NEW'
        }).promise()

        console.log(tableUpdates)

        return uploadReq;
    } catch (error) {
        console.error('Failed:', error);
        throw error
    }
}
