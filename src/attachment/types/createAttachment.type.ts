import { AttachmentType } from '@prisma/client';

export interface CreateAttachmentFormData {
  file: Express.Multer.File;
  name: string;
  type: AttachmentType;
}
