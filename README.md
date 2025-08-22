# Slack User Presence Saver

AWS Lambda function to retrieve Slack user presence and save it in DynamoDB.

## Features

- Queries Slack API for user presence (online/offline)
- Saves presence data to DynamoDB with timestamp
- Configurable via environment variables
- Error handling and logging

## Environment Variables

The following environment variables must be configured in your Lambda function:

- `SLACK_TOKEN` - Your Slack API token
- `SLACK_USER_ID` - The Slack user ID to monitor
- `DYNAMODB_TABLE_NAME` - DynamoDB table name

## DynamoDB Table Structure

The function expects a DynamoDB table with the following structure:

```
Table Name: slack-user-presence (specified by DYNAMODB_TABLE_NAM environment variable)
Partition Key: userid (String)
Sort Key: datetime (String)
```

## Deployment

```bash
npm run deploy
```

This creates a `lambda.zip` file that you can upload to AWS Lambda.


## Write access to DynamoDB

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "Statement1",
			"Effect": "Allow",
			"Action": [
				"dynamodb:PutItem"
			],
			"Resource": "arn:aws:dynamodb:*:*:table/slack-user-presence"
		}
	]
}
```

## License
MIT
