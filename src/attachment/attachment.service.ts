import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { CreateAttachmentFormData } from './types/createAttachment.type';

@Injectable()
export class AttachmentService {
  constructor(
    private prismaService: PrismaService,
    private uploadService: UploadService,
  ) {}

  async getAttachments(userId: string) {
    return this.prismaService.attachment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAttachmentById(id: string) {
    return this.prismaService.attachment.findUnique({
      where: { id },
    });
  }

  async createAttachment(userId: string, formData: CreateAttachmentFormData) {
    const file = formData.file;
    const name = formData.name;
    const url = file
      ? await this.uploadService.uploadSingleFile(file, 'attachments/')
      : null;

    return this.prismaService.attachment.create({
      data: {
        name,
        url,
        userId,
      },
    });
  }

  async editAttachment(id: string, name: string) {
    const attachment = await this.prismaService.attachment.update({
      where: { id },
      data: {
        name,
      },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    return this.prismaService.attachment.update({
      where: { id },
      data: { name },
    });
  }

  async deleteAttachment(id: string) {
    const attachment = await this.prismaService.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    return this.prismaService.attachment.delete({
      where: { id },
    });
  }
}
