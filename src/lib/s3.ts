import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  ...(process.env.S3_ENDPOINT && {
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
  }),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucket = process.env.S3_BUCKET_NAME!;

export async function uploadReleaseFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteReleaseFile(key: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function getSignedDownloadUrl(
  key: string,
  fileName: string,
  expiresIn = 900,
) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${fileName.replace(/["\\\r\n]/g, "_")}"`,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function uploadTicketFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedViewUrl(key: string, expiresIn = 900) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteTicketFiles(ticketId: string) {
  const prefix = `tickets/${ticketId}/`;
  const list = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
  );
  if (!list.Contents?.length) return;
  await Promise.all(
    list.Contents.map((obj) =>
      s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key! })),
    ),
  );
}
