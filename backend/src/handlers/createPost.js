const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const tileUtil = require('../utils/tile');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const POSTS_TABLE = process.env.POSTS_TABLE;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { text, images = [], lat, lon } = body;
    if (!text && images.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Empty post' }) };
    }

    const tileId = tileUtil.tileIdFromLatLon(lat || 0, lon || 0);
    const postId = uuidv4();
    const createdAt = new Date().toISOString();

    // Get author from JWT claims
    let authorId = null;
    if (event.requestContext?.authorizer?.jwt?.claims?.sub) {
      authorId = event.requestContext.authorizer.jwt.claims.sub;
    }

    const item = { tileId, createdAt, postId, authorId, text, images, lat, lon };

    await ddb.send(new PutCommand({ TableName: POSTS_TABLE, Item: item }));

    return { statusCode: 201, body: JSON.stringify(item) };
  } catch (err) {
    console.error('createPost error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create post' }) };
  }
};
