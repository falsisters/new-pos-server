import { AttachmentType } from '@prisma/client';

export interface CreateAttachmentFormData {
  file: Express.Multer.File;
  name: string;
  type: AttachmentType;
}

// Enhanced type for frontend validation
export interface CreateAttachmentFormDataWithValidation
  extends Omit<CreateAttachmentFormData, 'file'> {
  file: File; // Frontend File type instead of Multer File
}

// Supported image formats for attachments
export const SUPPORTED_ATTACHMENT_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/tif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/gif',
  'image/svg+xml',
] as const;

// Supported document formats for attachments
export const SUPPORTED_ATTACHMENT_DOCUMENT_FORMATS = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
] as const;

// All supported attachment formats
export const SUPPORTED_ATTACHMENT_FORMATS = [
  ...SUPPORTED_ATTACHMENT_IMAGE_FORMATS,
  ...SUPPORTED_ATTACHMENT_DOCUMENT_FORMATS,
] as const;

export const SUPPORTED_ATTACHMENT_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tiff',
  '.tif',
  '.avif',
  '.heic',
  '.heif',
  '.bmp',
  '.gif',
  '.svg',
  '.pdf',
  '.txt',
  '.docx',
  '.xlsx',
  '.doc',
  '.xls',
] as const;
