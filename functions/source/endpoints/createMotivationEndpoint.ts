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
    const motivationArn = process.env.CALL_MOTIVATION_ARN.replace('region', region).replace('account-id', accountId)
    try {
        console.log(`checking on call resolution classifier in createEndpoint...`)
        const callMotivationClassifierResult = await comprehend.describeDocumentClassifier({
            DocumentClassifierArn: motivationArn
            }).promise()
    
        const callMotivationClassifierProps = callMotivationClassifierResult.DocumentClassifierProperties
    
        if(callMotivationClassifierProps.Status === "TRAINED") {
            //create endpoint
            await comprehend.createEndpoint({
                EndpointName: process.env.CLASSIFIER_NAME + 'Endpoint', 
                ModelArn: motivationArn, 
                DesiredInferenceUnits: 1
            }).promise()
            .then(() => {
                // disable rule
                const ruleName = `${event.resources[0]}`.split("/")[1]
                console.log(`disabling rule... ${ruleName}`)
                disableRule(ruleName)
            })
        }else {
            console.log(`classifier status: ${callMotivationClassifierProps.Status}`)
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