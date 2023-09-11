import 'dotenv/config';

import bodyParser from 'body-parser';
import express, { Express, NextFunction, Request, Response } from 'express';
import { handler as sqsMessageHandler } from './src/sqs-message-handler';
import { handler as userRequestHandler } from './src/user-request-handler';
import { SqsClient } from './src/common/sqs/sqs';

const app: Express = express()
const port = process.env.PORT || '8080'

SqsClient.pushToSqs = (sqsMessageBody: any): any => {
    const message: any = {
        Records: [
            {
                messageId: "",
                body: JSON.stringify(sqsMessageBody)
            }
        ]
    }
    sqsMessageHandler(message)
        .then(res => console.log(`SQS handler response: ${JSON.stringify(res)}`))
        .catch(err => console.error("SQS handler errored", err))
}

app.use(bodyParser.json())
app.get("/dev/kognitos/api/v1/word", async (req: Request, res: Response) => {
    const query: any = req.query
    const gateWayRequest: any = { queryStringParameters: query }
    const out = await userRequestHandler(gateWayRequest)
    res.status(out.statusCode).json(JSON.parse(out.body))
})
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500)
    res.json({
        error: error.message
    })
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})