const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const USERS_TABLE = process.env.USERS_TABLE;

exports.handler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'userId required' }) };

    const res = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }));
    if (!res.Item) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    return { statusCode: 200, body: JSON.stringify(res.Item) };
  } catch (err) {
    console.error('getProfile error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to get profile' }) };
  }
};
