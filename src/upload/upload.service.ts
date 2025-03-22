import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly defaultBucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: `${process.env.AWS_REGION}`,
      credentials: {
        accessKeyId: `${process.env.AWS_ACCESS_KEY_ID}`,
        secretAccessKey: `${process.env.AWS_SECRET_ACCESS_KEY}`,
      }, // yes
    });

    this.defaultBucket = `${process.env.AWS_BUCKET_NAME}`;
  }

  async getPublicUrl(key: string) {
    return `https://${this.defaultBucket}.s3.amazonaws.com/${key}`;
  }

  async uploadSingleFile(file: Express.Multer.File, path: string) {
    const fileName = file.originalname.replace(/ /g, '_');
    const key = `${path}/${Date.now()}-${fileName}`;

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
