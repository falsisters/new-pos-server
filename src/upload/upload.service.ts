import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly defaultBucket: string;
  private readonly supabaseProjectUrl: string;

  // Supported image formats
  private readonly supportedFormats = [
    'jpeg',
    'jpg',
    'png',
    'webp',
    'tiff',
    'tif',
    'avif',
    'heif',
    'heic',
    'gif',
    'svg',
    'bmp',
  ];

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

  private isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  private getOptimalFormat(originalFormat: string, fileSize: number): string {
    // For large files, prefer more efficient formats
    if (fileSize > 5 * 1024 * 1024) {
      // > 5MB
      return 'webp'; // WebP offers better compression
    }

    // For smaller files, maintain quality with appropriate format
    switch (originalFormat) {
      case 'heic':
      case 'heif':
      case 'tiff':
      case 'tif':
      case 'bmp':
        return 'jpeg'; // Convert to JPEG for better compatibility
      case 'png':
        return 'png'; // Keep PNG for transparency
      case 'webp':
        return 'webp';
      case 'avif':
        return 'avif';
      default:
        return 'jpeg'; // Default fallback
    }
  }

  private async compressImage(
    file: Express.Multer.File,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    try {
      const sharpImage = sharp(file.buffer);
      const metadata = await sharpImage.metadata();

      if (!metadata.format) {
        throw new Error('Unable to determine image format');
      }

      const originalFormat = metadata.format.toLowerCase();
      const targetFormat = this.getOptimalFormat(originalFormat, file.size);

      // Resize if image is too large (maintain aspect ratio)
      let processedImage = sharpImage;

      if (metadata.width && metadata.width > 2048) {
        processedImage = processedImage.resize(2048, null, {
          withoutEnlargement: true,
          fit: 'inside',
        });
      }

      let compressedBuffer: Buffer;
      let contentType: string;

      // Apply format-specific compression
      switch (targetFormat) {
        case 'webp':
          compressedBuffer = await processedImage
            .webp({
              quality: file.size > 10 * 1024 * 1024 ? 75 : 85, // Lower quality for larger files
              effort: 6, // Higher effort for better compression
              smartSubsample: true,
            })
            .toBuffer();
          contentType = 'image/webp';
          break;

        case 'avif':
          compressedBuffer = await processedImage
            .avif({
              quality: file.size > 10 * 1024 * 1024 ? 70 : 80,
              effort: 6,
              chromaSubsampling: '4:2:0',
            })
            .toBuffer();
          contentType = 'image/avif';
          break;

        case 'png':
          compressedBuffer = await processedImage
            .png({
              quality: file.size > 10 * 1024 * 1024 ? 80 : 90,
              compressionLevel: 9, // Maximum compression
              adaptiveFiltering: true,
              palette: metadata.channels && metadata.channels <= 3, // Use palette for simple images
            })
            .toBuffer();
          contentType = 'image/png';
          break;

        case 'jpeg':
        default:
          compressedBuffer = await processedImage
            .jpeg({
              quality: file.size > 10 * 1024 * 1024 ? 75 : 85,
              progressive: true,
              mozjpeg: true, // Use mozjpeg encoder for better compression
              optimiseScans: true,
            })
            .toBuffer();
          contentType = 'image/jpeg';
          break;
      }

      return { buffer: compressedBuffer, contentType };
    } catch (error) {
      throw new Error(`Image compression failed: ${error.message}`);
    }
  }

  async uploadSingleFile(file: Express.Multer.File, path: string) {
    const fileName = file.originalname.replace(/ /g, '_');
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    const key = cleanPath
      ? `${cleanPath}/${Date.now()}-${fileName}`
      : `${Date.now()}-${fileName}`;

    try {
      let finalBuffer: Buffer;
      let finalContentType: string;

      // Check if file is an image and process accordingly
      if (this.isImageFile(file.mimetype)) {
        const compressed = await this.compressImage(file);
        finalBuffer = compressed.buffer;
        finalContentType = compressed.contentType;

        // If compressed file is still too large, apply more aggressive compression
        if (finalBuffer.length > 14 * 1024 * 1024) {
          // 14MB threshold
          const sharpImage = sharp(finalBuffer);
          const metadata = await sharpImage.metadata();

          // Apply more aggressive compression
          if (metadata.format === 'jpeg') {
            finalBuffer = await sharpImage
              .jpeg({ quality: 60, progressive: true, mozjpeg: true })
              .toBuffer();
          } else if (metadata.format === 'webp') {
            finalBuffer = await sharpImage
              .webp({ quality: 60, effort: 6 })
              .toBuffer();
          } else {
            // Convert to JPEG with aggressive compression as last resort
            finalBuffer = await sharpImage
              .jpeg({ quality: 50, progressive: true, mozjpeg: true })
              .toBuffer();
            finalContentType = 'image/jpeg';
          }
        }

        // Final size check
        if (finalBuffer.length > 15 * 1024 * 1024) {
          throw new Error(
            'File too large after compression. Please use a smaller image.',
          );
        }
      } else {
        // For non-image files, use original buffer
        finalBuffer = file.buffer;
        finalContentType = file.mimetype;

        // Check file size for non-images
        if (finalBuffer.length > 15 * 1024 * 1024) {
          throw new Error('File size exceeds 15MB limit.');
        }
      }

      const command = new PutObjectCommand({
        Bucket: this.defaultBucket,
        Key: key,
        Body: finalBuffer,
        ContentType: finalContentType,
      });

      await this.s3Client.send(command);

      return this.getPublicUrl(key);
    } catch (error) {
      if (
        error.message.includes('Input file contains unsupported image format')
      ) {
        throw new Error(
          'Unsupported image format. Please use JPEG, PNG, WebP, HEIC, TIFF, or AVIF.',
        );
      }
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async uploadAttachments(files: Express.Multer.File[], path: string) {
    const promises = files.map(async (file) => {
      return this.uploadSingleFile(file, path);
    });
    return await Promise.all(promises);
  }

  async deleteFileFromStorage(fileUrl: string): Promise<void> {
    try {
      // Extract the key from the public URL
      const urlPattern = new RegExp(
        `${this.supabaseProjectUrl}/storage/v1/object/public/${this.defaultBucket}/(.+)`,
      );
      const match = fileUrl.match(urlPattern);

      if (!match || !match[1]) {
        console.warn(`Unable to extract key from URL: ${fileUrl}`);
        return;
      }

      const key = match[1];

      const command = new DeleteObjectCommand({
        Bucket: this.defaultBucket,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`Successfully deleted file: ${key}`);
    } catch (error) {
      console.error(`Failed to delete file from storage: ${error.message}`);
      // Don't throw error to prevent blocking the deletion process
    }
  }
}
