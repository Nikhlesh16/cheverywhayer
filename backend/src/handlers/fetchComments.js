const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const COMMENTS_TABLE = process.env.COMMENTS_TABLE;

exports.handler = async (event) => {
  try {
    const postId = event.pathParameters && event.pathParameters.postId;
    if (!postId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'postId required' }) };
    }

    const res = await ddb
      .query({
        TableName: COMMENTS_TABLE,
        KeyConditionExpression: 'postId = :p',
        ExpressionAttributeValues: { ':p': postId },
      })
      .promise();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: res.Items || [] }),
    };
  } catch (err) {
    console.error('fetchComments error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch comments' }) };
  }
};
