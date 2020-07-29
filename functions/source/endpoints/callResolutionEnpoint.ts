import { Comprehend, CloudWatchEvents } from 'aws-sdk'

const comprehend = new Comprehend();
const cloudwatchEvents = new CloudWatchEvents();


export const disableRule = async (ruleName) => {
    await cloudwatchEvents.disableRule({
        Name: ruleName
    }) 
}

export const handler = async (event, context) => {
    const region = process.env.AWS_REGION
    const accountId = context.invokedFunctionArn.split(':')[4]
    const resolutionArn = process.env.CALL_RESOLUTION_ARN.replace('region', region).replace('account-id', accountId)
    try {
        console.log(`checking on call resolution classifier in createEndpoint...`)
        const callResolutionClassifierResult = await comprehend.describeDocumentClassifier({
            DocumentClassifierArn: resolutionArn
            }).promise()
    
        const callResolutionClassifierProps = callResolutionClassifierResult.DocumentClassifierProperties
    
        if(callResolutionClassifierProps.Status === "TRAINED") {
            //create endpoint
            await comprehend.createEndpoint({
                EndpointName: process.env.CLASSIFIER_NAME + 'Endpoint', 
                ModelArn: resolutionArn, 
                DesiredInferenceUnits: 1
            }).promise()
            .then(() => {
                // disable rule
                const ruleName = `${event.resources[0]}`.split("/")[1]
                console.log(`disabling rule... ${ruleName}`)
                disableRule(ruleName)
            })
        }else {
            console.log(`classifier status: ${callResolutionClassifierProps.Status}`)
        }
    } catch (error) {
        if(error.code === 'ResourceInUseException'){
            const ruleName = `${event.resources[0]}`.split("/")[1]                
            await cloudwatchEvents.disableRule({
                Name: ruleName
            }).promise()
        }
        else{
            console.error('Failed:',error);
            throw error
        }
    }
}