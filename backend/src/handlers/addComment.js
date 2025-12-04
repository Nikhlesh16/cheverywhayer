const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const COMMENTS_TABLE = process.env.COMMENTS_TABLE;

exports.handler = async (event) => {
  try {
    const postId = event.pathParameters?.postId;
    if (!postId) return { statusCode: 400, body: JSON.stringify({ error: 'postId required' }) };

    const body = JSON.parse(event.body || '{}');
    const { text } = body;
    if (!text) return { statusCode: 400, body: JSON.stringify({ error: 'Empty comment' }) };

    let authorId = null;
    if (event.requestContext?.authorizer?.jwt?.claims?.sub) {
      authorId = event.requestContext.authorizer.jwt.claims.sub;
    }

    const commentId = uuidv4();
    const createdAt = new Date().toISOString();
    const item = { postId, createdAt, commentId, authorId, text };

    await ddb.send(new PutCommand({ TableName: COMMENTS_TABLE, Item: item }));

    return { statusCode: 201, body: JSON.stringify(item) };
  } catch (err) {
    console.error('addComment error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add comment' }) };
  }
};
