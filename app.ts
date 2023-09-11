import 'dotenv/config';

import bodyParser from 'body-parser';
import express, { Express, NextFunction, Request, Response } from 'express';
import { handler as sqsMessageHandler } from './src/sqs-message-handler';
import { handler as userRequestHandler } from './src/user-request-handler';

const app: Express = express()
const port = process.env.PORT || '8080'

app.use(bodyParser.json())
app.get("/user-request-handler", async (req: Request, res: Response) => {
    const query: any = req.query
    const gateWayRequest: any = { queryStringParameters: query }
    const out = await userRequestHandler(gateWayRequest)
    res.status(out.statusCode).json(JSON.parse(out.body))
})
app.post("/sqs-message-handler", async (req: Request, res: Response) => {
    const body: any = req.body
    const out = await sqsMessageHandler(body, body, body)
    res.json(out)
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