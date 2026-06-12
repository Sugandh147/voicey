import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || "";
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.CLOUDFLARE_R2_BUCKET || "";
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function uploadToR2(key: string, fileBuffer: Buffer, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);
  
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  }
  return `/api/audio/${key}`;
}

export async function deleteFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  await r2Client.send(command);
}

export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });
  // Presigned URL valid for 10 minutes
  return getSignedUrl(r2Client, command, { expiresIn: 600 });
}

export async function getPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn: 600 });
}

export async function getR2FileBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  const response = await r2Client.send(command);
  if (!response.Body) {
    throw new Error("Empty response body from R2");
  }
  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}
