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

## Analyze

Run this script to analyse the gathere data.
```bash
DYNAMODB_TABLE_NAME=slack-user-presence npm run analyze
```

#### Example output:
```
📊 SLACK PRESENCE ANALYSIS

📅 Aug 22, Fri
  💼 Work Hours: 15:16 - 18:00
  🟢 Online:  2h 29m (88%)
  🔴 Offline: 20m (12%)
  ☕ Breaks: 1 (20m)
     1. 15:35 - 15:55 (20m)

📅 Aug 25, Mon
  💼 Work Hours: 09:40 - 17:05
  🟢 Online:  6h 5m (81%)
  🔴 Offline: 1h 25m (19%)
  ☕ Breaks: 3 (1h 25m)
     1. 11:25 - 11:30 (5m)
     2. 12:00 - 13:15 (1h 15m)
     3. 15:50 - 15:55 (5m)
```

## License
MIT
