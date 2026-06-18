/**
 * ============================================================
 * Storage Migration: Supabase Bucket → MinIO
 * ============================================================
 *
 * Copies all objects from the Supabase S3 bucket to MinIO,
 * preserving exact key paths so DB URL values remain valid.
 *
 * Prerequisites:
 *   - Set env vars for BOTH source (Supabase) and target (MinIO)
 *
 * Required env vars:
 *   SOURCE_S3_ENDPOINT        - Supabase S3 endpoint
 *   SOURCE_S3_REGION           - Supabase region
 *   SOURCE_S3_ACCESS_KEY_ID    - Supabase access key
 *   SOURCE_S3_SECRET_ACCESS_KEY- Supabase secret key
 *   SOURCE_S3_BUCKET_NAME     - Supabase bucket name
 *
 *   TARGET_S3_ENDPOINT        - MinIO endpoint
 *   TARGET_S3_REGION          - MinIO region (us-east-1)
 *   TARGET_S3_ACCESS_KEY_ID   - MinIO access key
 *   TARGET_S3_SECRET_ACCESS_KEY- MinIO secret key
 *   TARGET_S3_BUCKET_NAME     - MinIO bucket name
 *   TARGET_S3_FORCE_PATH_STYLE- true for MinIO
 *
 * Usage:
 *   npx ts-node scripts/migrate-storage.ts
 * ============================================================
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

async function migrateStorage() {
  const sourceClient = new S3Client({
    region: process.env.SOURCE_S3_REGION!,
    endpoint: process.env.SOURCE_S3_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.SOURCE_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.SOURCE_S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  const targetClient = new S3Client({
    region: process.env.TARGET_S3_REGION!,
    endpoint: process.env.TARGET_S3_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.TARGET_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.TARGET_S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: process.env.TARGET_S3_FORCE_PATH_STYLE === 'true',
  });

  const sourceBucket = process.env.SOURCE_S3_BUCKET_NAME!;
  const targetBucket = process.env.TARGET_S3_BUCKET_NAME!;

  let continuationToken: string | undefined;
  let totalCopied = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  console.log(`Source: ${process.env.SOURCE_S3_ENDPOINT}/${sourceBucket}`);
  console.log(`Target: ${process.env.TARGET_S3_ENDPOINT}/${targetBucket}`);
  console.log('---');

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: sourceBucket,
      ContinuationToken: continuationToken,
    });

    const response = await sourceClient.send(listCommand);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (!obj.Key) continue;

        const key = obj.Key;
        const size = obj.Size ?? 0;

        try {
          // Check if already exists in target
          try {
            await targetClient.send(
              new ListObjectsV2Command({
                Bucket: targetBucket,
                Prefix: key,
                MaxKeys: 1,
              }),
            );
          } catch {
            // Skip existence check errors
          }

          console.log(`Copying: ${key} (${(size / 1024).toFixed(1)} KB)`);

          const getCommand = new GetObjectCommand({
            Bucket: sourceBucket,
            Key: key,
          });

          const { Body, ContentType } = await sourceClient.send(getCommand);

          if (!Body) {
            console.warn(`  SKIP: empty body for ${key}`);
            totalSkipped++;
            continue;
          }

          const byteArray = await Body.transformToByteArray();

          await targetClient.send(
            new PutObjectCommand({
              Bucket: targetBucket,
              Key: key,
              Body: byteArray,
              ContentType: ContentType,
            }),
          );

          totalCopied++;
          console.log(`  OK`);
        } catch (error) {
          totalFailed++;
          console.error(`  FAIL: ${error.message}`);
        }
      }
    }

    continuationToken = response.NextContinuationToken;
    if (continuationToken) {
      console.log('--- next page ---');
    }
  } while (continuationToken);

  console.log('---');
  console.log(`Done. Copied: ${totalCopied}, Failed: ${totalFailed}, Skipped: ${totalSkipped}`);
}

migrateStorage().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
