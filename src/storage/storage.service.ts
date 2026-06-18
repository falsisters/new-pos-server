import { Injectable } from '@nestjs/common';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import JSZip from 'jszip';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private prisma: PrismaService) {
    const endpoint =
      process.env.S3_ENDPOINT || process.env.SUPABASE_S3_ENDPOINT;
    const region =
      process.env.S3_REGION || process.env.SUPABASE_REGION || 'us-east-1';
    const accessKeyId =
      process.env.S3_ACCESS_KEY_ID || process.env.SUPABASE_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.S3_SECRET_ACCESS_KEY || process.env.SUPABASE_SECRET_ACCESS_KEY;
    const forcePathStyle =
      process.env.S3_FORCE_PATH_STYLE === 'true' ||
      !!process.env.SUPABASE_S3_ENDPOINT;

    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle,
    });

    this.bucket =
      process.env.S3_BUCKET_NAME ||
      process.env.SUPABASE_BUCKET_NAME ||
      'falsisters-bucket';
  }

  async getUsage(): Promise<{
    total_size_bytes: number;
    total_size_readable: string;
  }> {
    let totalSize = 0;
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        ContinuationToken: continuationToken,
      });

      const response = await this.s3Client.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          totalSize += obj.Size ?? 0;
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    return {
      total_size_bytes: totalSize,
      total_size_readable: `${sizeMB} MB`,
    };
  }

  async exportStorage(): Promise<Buffer> {
    const zip = new JSZip();
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        ContinuationToken: continuationToken,
      });

      const response = await this.s3Client.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (!obj.Key) continue;

          try {
            const getCommand = new GetObjectCommand({
              Bucket: this.bucket,
              Key: obj.Key,
            });

            const { Body } = await this.s3Client.send(getCommand);

            if (Body) {
              const byteArray = await Body.transformToByteArray();
              zip.file(obj.Key, byteArray);
            }
          } catch (error) {
            console.error(`Failed to download ${obj.Key}: ${error.message}`);
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return zip.generateAsync({ type: 'nodebuffer' });
  }

  async clearStorage(): Promise<{ success: boolean; error?: string }> {
    try {
      let continuationToken: string | undefined;
      let deletedCount = 0;

      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: continuationToken,
        });

        const response = await this.s3Client.send(command);

        if (response.Contents) {
          for (const obj of response.Contents) {
            if (!obj.Key) continue;

            try {
              await this.s3Client.send(
                new DeleteObjectCommand({
                  Bucket: this.bucket,
                  Key: obj.Key,
                }),
              );
              deletedCount++;
            } catch (error) {
              console.error(`Failed to delete ${obj.Key}: ${error.message}`);
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getDatabaseUsage(): Promise<{
    total_size_bytes: number;
    total_size_readable: string;
  }> {
    const result = await this.prisma.$queryRaw<
      { db_size: string }[]
    >`SELECT pg_database_size(current_database()) AS db_size`;

    const dbSize = parseInt(result[0]?.db_size || '0', 10);
    const sizeMB = (dbSize / (1024 * 1024)).toFixed(2);

    return {
      total_size_bytes: dbSize,
      total_size_readable: `${sizeMB} MB`,
    };
  }
}
