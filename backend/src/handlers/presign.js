const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

const s3 = new S3Client({});
const BUCKET = process.env.MEDIA_BUCKET;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const filename = body.filename || uuidv4();
    const contentType = body.contentType || 'application/octet-stream';
    const key = `uploads/${Date.now()}_${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadUrl: url, key }),
    };
  } catch (err) {
    console.error('presign error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate presigned URL' }) };
  }
};
