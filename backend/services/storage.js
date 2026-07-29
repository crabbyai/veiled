// ─── Photo storage ──────────────────────────────────────────────────
// Uploads go to S3-compatible object storage in production (durable +
// CDN-served) and fall back to the local uploads dir in development.
// Wire: routes/dating.js photo upload calls put()/publicUrl().

const fs = require('fs');
const path = require('path');
const { config, safeRequire } = require('./config');

const LOCAL_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

let s3 = null;
function s3Client() {
  if (s3) return s3;
  const AWS = safeRequire('@aws-sdk/client-s3');
  if (!AWS) return null; // package not installed → fall back to local
  s3 = new AWS.S3Client({
    region: config.storage.region,
    endpoint: config.storage.endpoint || undefined,
    credentials: { accessKeyId: config.storage.accessKeyId, secretAccessKey: config.storage.secretAccessKey },
  });
  s3._AWS = AWS;
  return s3;
}

const isRemote = () => config.storage.provider === 's3';

// Persist a file already written to disk by multer. Returns the public URL.
async function put(localPath, key, contentType = 'image/jpeg') {
  if (isRemote()) {
    const client = s3Client();
    if (client) {
      const body = fs.readFileSync(localPath);
      await client.send(new client._AWS.PutObjectCommand({
        Bucket: config.storage.bucket, Key: key, Body: body, ContentType: contentType,
      }));
      fs.unlink(localPath, () => {}); // remove the temp local copy
      return publicUrl(key);
    }
    console.warn('[storage] S3 selected but @aws-sdk/client-s3 not installed; using local');
  }
  return `/uploads/${path.basename(localPath)}`;
}

function publicUrl(key) {
  if (isRemote()) {
    if (config.storage.publicBaseUrl) return `${config.storage.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    return `https://${config.storage.bucket}.s3.${config.storage.region}.amazonaws.com/${key}`;
  }
  return key.startsWith('/uploads/') ? key : `/uploads/${key}`;
}

async function remove(key) {
  if (isRemote()) {
    const client = s3Client();
    if (client) {
      try { await client.send(new client._AWS.DeleteObjectCommand({ Bucket: config.storage.bucket, Key: key })); } catch (e) { console.error('[storage] delete', e.message); }
      return;
    }
  }
  const p = path.join(LOCAL_DIR, path.basename(key));
  fs.unlink(p, () => {});
}

module.exports = { put, publicUrl, remove, isRemote };
