import { S3Handler, S3Event } from 'aws-lambda'
import 'source-map-support/register'
import { TranscribeService, DynamoDB, S3 } from 'aws-sdk'
import { parseS3Object } from '@music-metadata/s3'

import { StartTranscriptionJobRequest } from 'aws-sdk/clients/transcribeservice'
import FileType from 'file-type'

const transcribeService = new TranscribeService({ apiVersion: '2017-10-26' })
const documentClient = new DynamoDB.DocumentClient()
const s3 = new S3({ apiVersion: '2006-03-01' })

type S3Params = {
  name: string;
  key: string;
  type: string;
  size: number;
  format?: string;
  numberOfChannels?: number;
  meta?: any;
}

export const extractBucketParams = (event: S3Event): S3Params[] => event.Records
  .map(({ s3 }) => ({
    name: s3.bucket.name,
    key: s3.object.key,
    type: s3.object.key.includes('txt') ? 'text' : 'audio',
    size: s3.object.size
  }))

export const doesVocabularyExist = async (): Promise<boolean> => {
  try {
    await transcribeService.getVocabulary({
      VocabularyName: process.env.CUSTOM_VOCABULARY_NAME
    }).promise()
    return true
  } catch (e) {
    if (e.message === "The requested vocabulary couldn't be found. Check the vocabulary name and try your request again.") {
      return false
    } else {
      throw e
    }
  }
}

export const getAudioMetadata = async (s3Object: S3Params): Promise<S3Params> => {
  const params = {
    Bucket: s3Object.name,
    Key: decodeURIComponent(s3Object.key)
  }
  // get mime type
  const stream = s3.getObject(params).createReadStream()
  const mimeType = await FileType.fromStream(stream)
  const meta = await s3.headObject(params).promise()
  const metadata = await parseS3Object(s3, params, {
    disableChunked: true
  })
  console.log(metadata.format)
  stream.destroy()
  return {
    ...s3Object,
    format: mimeType.ext,
    numberOfChannels: metadata.format.numberOfChannels,
    meta: meta.Metadata
  }
}

export const createOrUpdateVocabulary = async (vocab: S3Params): Promise<void> => {
  const params = {
    LanguageCode: 'en-US',
    VocabularyName: process.env.CUSTOM_VOCABULARY_NAME,
    VocabularyFileUri: `s3://${vocab.name}/${vocab.key}`,
  }
  const exists = await doesVocabularyExist()
  if (exists) {
    console.log('Updating Vocabulary')
    await transcribeService.updateVocabulary(params).promise()
  } else {
    await transcribeService.createVocabulary(params).promise()
    console.log('Creating Vocabulary') 
  }
}

export const handler: S3Handler = async (event: S3Event) => {
  // get paths for created objects
  const objectParams = extractBucketParams(event)
  console.log(objectParams)
  const vocab = objectParams.find(params => params.type === 'text')
  if (vocab) {
    await createOrUpdateVocabulary(vocab)
  }

  const s3Objects = await Promise.all(objectParams.filter(params => params.type === 'audio').map(params => getAudioMetadata(params)))
  // get bucket paths for all event-sourced objects
  const paramMap: StartTranscriptionJobRequest[] = s3Objects
    .filter(params => params.type === 'audio')
    .map(params => {
      let transcriptionJob: StartTranscriptionJobRequest =  {
        LanguageCode: 'en-US',
        Media: {
          MediaFileUri: decodeURIComponent(`s3://${params.name}/${params.key}`)
        },
        TranscriptionJobName: decodeURIComponent(params.key),
        MediaFormat: params.format,
        OutputBucketName: process.env.TRANSCRIBE_OUTPUT_BUCKET
      }
      if (params.numberOfChannels > 1) {
        transcriptionJob = {
          ...transcriptionJob,
          Settings: {
            ChannelIdentification: true,
            ShowSpeakerLabels: false
          }
        }
      } else {
        transcriptionJob = {
          ...transcriptionJob,
          Settings: {
            ChannelIdentification: false,
            ShowSpeakerLabels: true,
            MaxSpeakerLabels: 2
          }
        }
      }
      
      const customVocabulary = process.env.CUSTOM_VOCABULARY_NAME
      if (customVocabulary && customVocabulary !== '') {
        console.log(`Using custom vocabulary: ${customVocabulary}`)
        return {
          ...transcriptionJob,
          Settings: {
            ...transcriptionJob.Settings,
            VocabularyName: customVocabulary
          }
        }
      }
      return transcriptionJob
  })
  // start all transcription jobs
  await Promise
    .all(paramMap.map(params => transcribeService.startTranscriptionJob(params).promise()))

  console.log(s3Objects)
  
  // update table to reflect 
  const tableUpdates = s3Objects.map((r, i) => documentClient.update({
    TableName: process.env.TABLE_NAME,
    Key: {
      jobId: r.meta.jobid,
      lastModified: r.meta.lastmodified
    },
    ExpressionAttributeNames: {
      '#status': 'status',
      '#transcriptionJobName': 'transcriptionJobName'
    },
    ExpressionAttributeValues: {
      ':st1': 1,
      ':tjn': `${decodeURIComponent(s3Objects[i].key)}.json`
    },
    UpdateExpression: 'set #status = :st1, #transcriptionJobName = :tjn',
    ReturnValues: 'ALL_NEW'
  }).promise())

  const updated = await Promise.all(tableUpdates)

  console.log({
    statusCode: 200,
    jobStatus: updated.map(res => res.Attributes)
  })
}
