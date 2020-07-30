import {
  expect
} from 'chai'
import * as sinon from 'sinon'
import proxyquire from 'proxyquire'
import {
  extractBucketParams
} from './transcribeHandler'
import { S3Event } from 'aws-lambda'
import { StartTranscriptionJobResponse } from 'aws-sdk/clients/transcribeservice'

const mockVocab = {
  name: 'test-bucket',
  key: 'test-object.mp3',
  type: 'audio'
}

const mockTranscriptionJob: StartTranscriptionJobResponse = {
  TranscriptionJob: {
    TranscriptionJobName: 'test-name',
    Media: {
      MediaFileUri: 'test-uri'
    }
  }
}

const mockEvent: S3Event = {
  Records: [{
    eventVersion: '',
    eventSource: '',
    awsRegion: '',
    eventTime: '',
    eventName: '',
    userIdentity: { principalId: '' },
    requestParameters: {
      sourceIPAddress: ''
    },
    responseElements: {
      'x-amz-request-id': '',
      'x-amz-id-2': '',
    },
    s3: {
      s3SchemaVersion: '',
      configurationId: '',
      bucket: {
        name: 'test-bucket',
        ownerIdentity: {
          principalId: ''
        },
        arn: ''
      },
      object: {
        key: 'test-key.mp3',
        size: 0,
        eTag: '',
        sequencer: ''
      }
    }
  }]
}

describe('transcribeJobProducer', function () {
  describe('handler', function() {
    it('should send a transcription job to Amazon Transcribe', async function () {
      const mockProducer = sinon.stub().returns({
        promise: sinon.stub().resolves(mockTranscriptionJob)
      })
      const mockQuery = sinon.stub().returns({
        promise: sinon.stub().resolves({
          Items: [{}]
        })
      })
      const mockUpdate = sinon.stub().returns({
        promise: sinon.stub().resolves({})
      })
      const mockGet = sinon.stub().returns({
        createReadStream: sinon.stub().returns({
          destroy: sinon.stub()
        })
      })
      const mockHead = sinon.stub().returns({
        promise: sinon.stub().resolves({
          Metadata: {}
        })
      })
      const mockParse = sinon.stub().resolves({
        format: {
          numberOfChannels: 1
        }
      })
      const mockFromStream = sinon.stub().resolves({
        ext: 'test',
        mime: 'test'
      })
      const mockUuid = sinon.stub().returns('test-uuid')
      const transcribeJobProducer = proxyquire('./transcribeJobProducer', {
        'aws-sdk': {
          TranscribeService: function (): void {
            this.startTranscriptionJob = mockProducer
          },
          DynamoDB: {
            DocumentClient: function (): void {
              this.query = mockQuery
              this.update = mockUpdate
            }
          },
          S3: function (): void {
            this.getObject = mockGet
            this.headObject = mockHead
          }
        },
        'uuid/v4': mockUuid,
        '@music-metadata/s3': {
          parseS3Object: mockParse
        },
        'file-type': {
          fromStream: mockFromStream
        }
      })
      await transcribeJobProducer.handler(mockEvent)
      expect(mockProducer.called).to.be.true
      expect(mockGet.called).to.be.true
      expect(mockHead.called).to.be.true
      expect(mockParse.called).to.be.true
      expect(mockFromStream.called).to.be.true
      expect(mockUpdate.called).to.be.true
    })
  })
  describe('extractBucketParams', function () {
    it('should return bucket paths from S3Event Records', function () {
      expect(extractBucketParams(mockEvent)).to.deep.equal([{ name: 'test-bucket', key: 'test-key.mp3', type: 'audio', size: 0 }])
      expect(extractBucketParams({
        ...mockEvent,
        Records: [{
          ...mockEvent.Records[0],
          s3: {
            ...mockEvent.Records[0].s3,
            object: {
              key: 'test-key.txt',
              size: 0,
              eTag: '',
              sequencer: '',
            }
          }
        }]
      })).to.deep.equal([{ name: 'test-bucket', key: 'test-key.txt', type: 'text', size: 0 }])
    })
  })
  describe('doesVocabularyExist', function () {
    it('should return true if vocabulary exists', async function () {
      const mockGet = sinon.stub().returns({
        promise: sinon.stub().resolves(mockTranscriptionJob)
      })
      const transcribeJobProducer = proxyquire('./transcribeJobProducer', {
        'aws-sdk': {
          TranscribeService: function (): void {
            this.getVocabulary = mockGet
          },
        }
      })
      const exists = await transcribeJobProducer.doesVocabularyExist()
      expect(exists).to.be.true
    })
    it('should return false if vocabulary does not exist', async function () {
      const mockGet = sinon.stub().returns({
        promise: sinon.stub()
          .rejects(Error("The requested vocabulary couldn't be found. Check the vocabulary name and try your request again."))
      })
      const transcribeJobProducer = proxyquire('./transcribeJobProducer', {
        'aws-sdk': {
          TranscribeService: function (): void {
            this.getVocabulary = mockGet
          },
        }
      })
      const exists = await transcribeJobProducer.doesVocabularyExist()
      expect(exists).to.be.false
    })
    it('should throw an error if something goes wrong with the Transcribe Service', async function () {
      const mockGet = sinon.stub().returns({
        promise: sinon.stub().rejects(Error('Something went wrong'))
      })
      const transcribeJobProducer = proxyquire('./transcribeJobProducer', {
        'aws-sdk': {
          TranscribeService: function (): void {
            this.getVocabulary = mockGet
          },
        }
      })
      try {
        await transcribeJobProducer.doesVocabularyExist()
      } catch (e) {
        expect(e.message).to.equal('Something went wrong')
      }
    })
  })
  describe('createOrUpdateVocabulary', function () {
    it('should update vocabulary when it already exists', async function () {
      const mockGet = sinon.stub().returns({
        promise: sinon.stub().resolves(mockTranscriptionJob)
      })
      const mockUpdate = sinon.stub().returns({ promise: sinon.stub().resolves() })
      const mockCreate = sinon.stub().returns({ promise: sinon.stub().resolves() })
      const transcribeJobProducer = proxyquire('./transcribeJobProducer', {
        'aws-sdk': {
          TranscribeService: function (): void {
            this.getVocabulary = mockGet
            this.updateVocabulary = mockUpdate
            this.createVocabulary = mockCreate
          },
        }
      })
      await transcribeJobProducer.createOrUpdateVocabulary(mockVocab)
      expect(mockUpdate.called).to.be.true
    })
    it('should create vocabulary when it does not exist', async function () {
      const mockGet = sinon.stub().returns({
        promise: sinon.stub()
          .rejects(Error("The requested vocabulary couldn't be found. Check the vocabulary name and try your request again."))
      })
      const mockUpdate = sinon.stub().returns({ promise: sinon.stub().resolves() })
      const mockCreate = sinon.stub().returns({ promise: sinon.stub().resolves() })
      const transcribeJobProducer = proxyquire('./transcribeJobProducer', {
        'aws-sdk': {
          TranscribeService: function (): void {
            this.getVocabulary = mockGet
            this.updateVocabulary = mockUpdate
            this.createVocabulary = mockCreate
          },
        }
      })
      await transcribeJobProducer.createOrUpdateVocabulary(mockVocab)
      expect(mockCreate.called).to.be.true
    })
  })
})