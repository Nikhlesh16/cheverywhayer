const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const POSTS_TABLE = process.env.POSTS_TABLE;

async function queryByTile(tileId) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: POSTS_TABLE,
      KeyConditionExpression: 'tileId = :t',
      ExpressionAttributeValues: { ':t': tileId },
      ScanIndexForward: false, // newest first
    })
  );
  return res.Items || [];
}

exports.handler = async (event) => {
  try {
    const qp = event.queryStringParameters || {};
    if (qp.tileId) {
      const items = await queryByTile(qp.tileId);
      return { statusCode: 200, body: JSON.stringify({ posts: items }) };
    }
    if (qp.tiles) {
      const tiles = qp.tiles.split(',').map((t) => t.trim()).filter(Boolean);
      const all = [];
      for (const t of tiles) {
        const items = await queryByTile(t);
        all.push(...items);
      }
      all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return { statusCode: 200, body: JSON.stringify({ posts: all }) };
    }
    return { statusCode: 400, body: JSON.stringify({ error: 'tileId or tiles query required' }) };
  } catch (err) {
    console.error('fetchPosts error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch posts' }) };
  }
};
