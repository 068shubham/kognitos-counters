# Introduction
Write an AWS lambda function that accepts a word as an input, and returns how many
times that word or any anagram of that word has been seen. The function should ignore
casing of words.
Here is a sequence of sample inputs and outputs to demonstrate the expected
behavior:

Input | Output
--- | ---
{”word”: “Kognitos”} | {”occurrences”: 1}
{”word”: “automation”} | {”occurrences”: 1}
{”word”: “kognitos”} | {”occurrences”: 2}
{”word”: “process”} | {”occurrences”: 1}
{”word”: “beak”} | {”occurrences”: 1}
{”word”: “bAke”} | {”occurrences”: 2}

# Testing cURL
`curl --location --globoff 'https://n8vowhr2r8.execute-api.us-west-2.amazonaws.com/dev/kognitos/api/v1/word?word={inputWord}'`

# High level design
<img width="610" alt="image" src="https://github.com/068shubham/kognitos-counters/assets/8055274/85ab066b-e3c3-471e-a646-e5d1f8e116eb">

# Infra components
## lambda
1. [user-request-handler](https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/user-request-handler) - To handle incoming user APIs
2. [sqs-message-handler](https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/sqs-message-handler) - To push incoming user requests to persistent storage
## api-gateway
1. [WordCount](https://us-west-2.console.aws.amazon.com/apigateway/main/apis/n8vowhr2r8/resources?api=n8vowhr2r8&region=us-west-2)
## sqs
1. [sqs-kognitos-word-count](https://us-west-2.console.aws.amazon.com/sqs/v2/home?region=us-west-2#/queues/https%3A%2F%2Fsqs.us-west-2.amazonaws.com%2F900256459257%2Fsqs-kognitos-word-count) - queue for async persistence
2. [dlq-sqs-kognitos-word-count](https://us-west-2.console.aws.amazon.com/sqs/v2/home?region=us-west-2#/queues/https%3A%2F%2Fsqs.us-west-2.amazonaws.com%2F900256459257%2Fdlq-sqs-kognitos-word-count) - dlq for persistence failures
## vpc-endpoint
1. [sqs-vpc-endpoint](https://us-west-2.console.aws.amazon.com/vpc/home?region=us-west-2#EndpointDetails:vpcEndpointId=vpce-0250bbb1b3f4de79a) - for lambda to sqs connection
## rds
1. [rds-pg-kognitos-word-count](https://us-west-2.console.aws.amazon.com/rds/home?region=us-west-2#database:id=rds-pg-kognitos-word-count;is-cluster=false) - Postgres DB for persistent storage of words
## elaticache
1. [kognitos-word-count](https://us-west-2.console.aws.amazon.com/elasticache/home?region=us-west-2#/redis/kognitos-word-count) - Redis cluster for storing real time word counts

# Steps to scale up
## Scale up elaticache
Update the instance type and shards based on the expected throughput
## Scale up rds
Update the instance type based on the expected throughput

# Local testing
- docker-compose up -d
- npm i
- npm run migration
- setup aws credential in local
- Update .env file with correct values. Below is a sample config
```
POSTGRES_CONFIG={"host":"localhost","port":5401, "database":"kognitos", "username":"kognitos", "password":"kognitos", "connectionTimeout": 2000, "ssl": false}
REDIS_MODE=NON_CLUSTER
REDIS_NODE={"host":"localhost","port":6301}
SQS_QUEUE_URL=https://sqs.us-west-2.amazonaws.com/900256459257/sqs-kognitos-word-count
```
- npm run local
- Mimic user request
`curl --location 'localhost:8080/user-request-handler?word=a2bcde'`
- Mimic sqs persistence
`curl --location 'localhost:8080/sqs-message-handler' \
--header 'Content-Type: application/json' \
--data '{
    "Records": [
        {
            "messageId": "1",
            "body": "{\"requestId\":\"d65e537c-047d-491e-8333-901028cc36d6\",\"originalWord\":\"a2bcd\",\"searchKey\":\"2abcd\"}"
        }
    ]
}'`

# Local testing limitations
- Only lambda executions are tested
- Messages pushed to sqs will remain unprocessed

# Pushing latest code
- Create .zip file
- bash zip.sh
- Go to [user-request-handler](https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/user-request-handler)
- Upload lambda.zip
- Go to [sqs-message-handler ](https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/sqs-message-handler)
- Upload lambda.zip
