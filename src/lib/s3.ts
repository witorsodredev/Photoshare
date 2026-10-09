import "server-only";
import { Readable } from "node:stream";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";

export const BUCKET = process.env.S3_BUCKET || "photos";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
  },
});

let bucketReady = false;

export async function ensureBucket() {
  if (bucketReady) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    } catch {
      /* another worker may have created it — ignore */
    }
  }
  bucketReady = true;
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
) {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
    }),
  );
}

export async function getObject(key: string) {
  await ensureBucket();
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return {
    body: res.Body as Readable,
    contentType: res.ContentType || "application/octet-stream",
    contentLength: res.ContentLength,
  };
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const { body } = await getObject(key);
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export async function deleteKeys(keys: string[]) {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return;
  await ensureBucket();
  if (unique.length === 1) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: unique[0] }));
    return;
  }
  // DeleteObjects accepts at most 1000 keys per call.
  for (let i = 0; i < unique.length; i += 1000) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: unique.slice(i, i + 1000).map((Key) => ({ Key })) },
      }),
    );
  }
}

export async function storageHealthy(): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch {
    return false;
  }
}
