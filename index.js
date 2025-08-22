const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamoDbClient = new DynamoDBClient();

const getSlackUserPresence = async (token, userId) => {
    const postData = new URLSearchParams({
        token: token,
        user: userId,
    }).toString();

    try {
        const response = await fetch('https://slack.com/api/users.getPresence', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: postData,
        });

        const data = await response.json();

        if (data.ok) {
            return data.presence;
        } else {
            throw new Error(`Slack API error: ${data.error}`);
        }
    } catch (error) {
        throw new Error(`Request failed: ${error.message}`);
    }
};

const savePresenceToDynamoDB = async (tableName, userId, presence, datetime) => {
    const params = {
        TableName: tableName,
        Item: {
            userid: { S: userId },
            presence: { S: presence },
            datetime: { S: datetime },
        },
    };

    try {
        const command = new PutItemCommand(params);
        await dynamoDbClient.send(command);
        console.log(`Successfully saved presence data for user ${userId}`);
    } catch (error) {
        throw new Error(`Failed to save to DynamoDB: ${error.message}`);
    }
};


exports.handler = async (event, context) => {
    console.log('Lambda function started');

    try {
        const slackToken = process.env.SLACK_TOKEN;
        const userId = process.env.SLACK_USER_ID;
        const tableName = process.env.DYNAMODB_TABLE_NAME;

        if (!slackToken) {
            throw new Error('SLACK_TOKEN environment variable is required');
        }
        if (!userId) {
            throw new Error('SLACK_USER_ID environment variable is required');
        }
        if (!tableName) {
            throw new Error('DYNAMODB_TABLE_NAME environment variable is required');
        }

        console.log(`Checking presence for user: ${userId}`);

        const presence = await getSlackUserPresence(slackToken, userId);
        console.log(`User presence: ${presence}`);

        const datetime = new Date().toISOString();

        await savePresenceToDynamoDB(tableName, userId, presence, datetime);

        return 'ok';
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
};
