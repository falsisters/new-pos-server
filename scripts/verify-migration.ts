/**
 * ============================================================
 * Migration Verification
 * ============================================================
 *
 * Compares object counts between Supabase and MinIO buckets.
 *
 * Required env vars (same as migrate-storage.ts):
 *   SOURCE_S3_* and TARGET_S3_*
 *
 * Usage:
 *   npx ts-node scripts/verify-migration.ts
 * ============================================================
 */

import {
  S3Client,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

async function countObjects(client: S3Client, bucket: string): Promise<{ count: number; totalSize: number }> {
  let continuationToken: string | undefined;
  let count = 0;
  let totalSize = 0;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    });

    const response = await client.send(command);

    if (response.Contents) {
      count += response.Contents.length;
      for (const obj of response.Contents) {
        totalSize += obj.Size ?? 0;
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return { count, totalSize };
}

async function verify() {
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

  console.log('Counting source objects...');
  const source = await countObjects(sourceClient, sourceBucket);

  console.log('Counting target objects...');
  const target = await countObjects(targetClient, targetBucket);

  console.log('---');
  console.log(`Source (Supabase): ${source.count} objects, ${(source.totalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Target (MinIO):    ${target.count} objects, ${(target.totalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log('---');

  if (source.count === target.count) {
    console.log('PASS: Object counts match!');
  } else {
    console.log(`MISMATCH: ${Math.abs(source.count - target.count)} objects difference`);
  }

  if (Math.abs(source.totalSize - target.totalSize) < 1024) {
    console.log('PASS: Total sizes are within 1KB');
  } else {
    console.log(`SIZE DIFF: ${((Math.abs(source.totalSize - target.totalSize)) / (1024 * 1024)).toFixed(2)} MB`);
  }
}

verify().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
