import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly defaultBucket: string;
  private readonly supabaseProjectUrl: string;

  constructor() {
    this.s3Client = new S3Client({
      region: `${process.env.SUPABASE_REGION}`, // Usually 'us-east-1' for Supabase
      endpoint: `${process.env.SUPABASE_S3_ENDPOINT}`, // e.g., https://your-project.supabase.co/storage/v1/s3
      credentials: {
        accessKeyId: `${process.env.SUPABASE_ACCESS_KEY_ID}`,
        secretAccessKey: `${process.env.SUPABASE_SECRET_ACCESS_KEY}`,
      },
      forcePathStyle: true, // Required for Supabase S3 compatibility
    });

    this.defaultBucket = `${process.env.SUPABASE_BUCKET_NAME}`;
    this.supabaseProjectUrl = `${process.env.SUPABASE_PROJECT_URL}`; // e.g., https://your-project.supabase.co
  }

  async getPublicUrl(key: string) {
    return `${this.supabaseProjectUrl}/storage/v1/object/public/${this.defaultBucket}/${key}`;
  }

  async uploadSingleFile(file: Express.Multer.File, path: string) {
    const fileName = file.originalname.replace(/ /g, '_');
    // Remove leading/trailing slashes and ensure single slash between path and filename
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    const key = cleanPath
      ? `${cleanPath}/${Date.now()}-${fileName}`
      : `${Date.now()}-${fileName}`;

    try {
      const compressedFile = await sharp(file.buffer)
        .jpeg({ quality: 85 })
        .toBuffer();

      const command = new PutObjectCommand({
        Bucket: this.defaultBucket,
        Key: key,
        Body: compressedFile,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      return this.getPublicUrl(key);
    } catch (e) {
      throw new Error(e);
    }
  }

  async uploadAttachments(files: Express.Multer.File[], path: string) {
    const promises = files.map(async (file) => {
      return this.uploadSingleFile(file, path);
    });
    return await Promise.all(promises);
  }
}
