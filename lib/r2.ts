import { env } from "./env";
import { createHash } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MAX_MEDIA_BYTES, validMediaHead } from "./media";
export function r2Ready() {
  return (
    /^[a-f0-9]{32}$/.test(env.R2_ACCOUNT_ID || "") &&
    /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(env.R2_BUCKET_NAME || "") &&
    Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY)
  );
}
let client: S3Client | undefined;
function connection() {
  if (!r2Ready())
    throw Error(
      "Configure R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in Vercel, then redeploy. See R2_SETUP.md.",
    );
  return (client ||= new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    maxAttempts: 2,
  }));
}
function key(value: string) {
  if (
    !/^(?:media|incoming)\/[a-f0-9-]{36}$/.test(value) &&
    !/^backups\/[\dTZ.-]+-[a-f0-9-]{36}\.json$/.test(value)
  )
    throw Error("Invalid R2 object key.");
  return { Bucket: env.R2_BUCKET_NAME!, Key: value };
}
export async function r2UploadUrl(id: string, type: string, sha256: string) {
  return getSignedUrl(
    connection(),
    new PutObjectCommand({
      ...key(`incoming/${id}`),
      ContentType: type,
      Metadata: { sha256 },
    }),
    {
      expiresIn: 300,
      signableHeaders: new Set(["content-type"]),
      unhoistableHeaders: new Set(["x-amz-meta-sha256"]),
    },
  );
}
export async function r2DownloadUrl(objectKey: string, seconds = 60) {
  return getSignedUrl(connection(), new GetObjectCommand(key(objectKey)), {
    expiresIn: Math.min(3600, Math.max(60, seconds)),
  });
}
export async function r2Put(
  objectKey: string,
  bytes: Uint8Array,
  type: string,
) {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  await connection().send(
    new PutObjectCommand({
      ...key(objectKey),
      Body: bytes,
      ContentType: type,
      ContentDisposition:
        type.startsWith("image/") ||
        type.startsWith("video/") ||
        type.startsWith("audio/")
          ? "inline"
          : "attachment",
      Metadata: { sha256 },
    }),
    { abortSignal: AbortSignal.timeout(90000) },
  );
  return sha256;
}
export async function r2Read(objectKey: string) {
  const data = await connection().send(new GetObjectCommand(key(objectKey)), {
    abortSignal: AbortSignal.timeout(90000),
  });
  if (!data.Body) throw Error("R2 file is unavailable.");
  return {
    body: await data.Body.transformToByteArray(),
    httpMetadata: {
      contentType: data.ContentType || "application/octet-stream",
    },
  };
}
export async function r2Remove(objectKey: string) {
  await connection().send(new DeleteObjectCommand(key(objectKey)), {
    abortSignal: AbortSignal.timeout(15000),
  });
}
export async function r2VerifyAndPromote(
  id: string,
  expected: { size: number; type: string; sha256: string },
) {
  const source = key(`incoming/${id}`);
  const head = await connection().send(new HeadObjectCommand(source), {
    abortSignal: AbortSignal.timeout(15000),
  });
  if (
    head.ContentLength !== expected.size ||
    head.ContentType !== expected.type ||
    head.Metadata?.sha256 !== expected.sha256 ||
    !head.ETag
  )
    throw Error("The uploaded file does not match its reservation.");
  const data = await connection().send(
    new GetObjectCommand({ ...source, IfMatch: head.ETag }),
    { abortSignal: AbortSignal.timeout(90000) },
  );
  if (!data.Body) throw Error("The upload could not be verified.");
  const hash = createHash("sha256");
  let size = 0,
    prefix: Uint8Array | undefined;
  for await (const part of data.Body as AsyncIterable<Uint8Array>) {
    size += part.length;
    if (size > MAX_MEDIA_BYTES || size > expected.size)
      throw Error("The upload exceeds its size limit.");
    if (!prefix) prefix = part.slice(0, 64);
    else if (prefix.length < 64)
      prefix = Uint8Array.from([
        ...prefix,
        ...part.slice(0, 64 - prefix.length),
      ]);
    hash.update(part);
  }
  if (
    size !== expected.size ||
    hash.digest("hex") !== expected.sha256 ||
    !validMediaHead(expected.type, prefix || new Uint8Array())
  )
    throw Error("File type or original-byte integrity verification failed.");
  // A replayable upload URL only writes to incoming/. Published files have a separate key.
  await connection().send(
    new CopyObjectCommand({
      ...key(`media/${id}`),
      CopySource: `${env.R2_BUCKET_NAME}/incoming/${id}`,
      CopySourceIfMatch: head.ETag,
      MetadataDirective: "REPLACE",
      Metadata: { sha256: expected.sha256 },
      ContentType: expected.type,
      ContentDisposition:
        expected.type.startsWith("image/") ||
        expected.type.startsWith("video/") ||
        expected.type.startsWith("audio/")
          ? "inline"
          : "attachment",
    }),
    { abortSignal: AbortSignal.timeout(90000) },
  );
  await r2Remove(`incoming/${id}`).catch(() => {});
}
export async function r2Backups() {
  const result = await connection().send(
    new ListObjectsV2Command({
      Bucket: env.R2_BUCKET_NAME,
      Prefix: "backups/",
      MaxKeys: 1000,
    }),
    { abortSignal: AbortSignal.timeout(15000) },
  );
  return (result.Contents || [])
    .map((x) => ({
      key: x.Key!,
      size: x.Size || 0,
      created: x.LastModified?.toISOString() || "",
    }))
    .sort((a, b) => b.created.localeCompare(a.created));
}
