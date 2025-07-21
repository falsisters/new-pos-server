import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { CreateAttachmentFormData } from './types/createAttachment.type';
import { AttachmentType } from '@prisma/client';

@Injectable()
export class AttachmentService {
  constructor(
    private prismaService: PrismaService,
    private uploadService: UploadService,
  ) {}

  private formatAttachment(attachment: any) {
    if (!attachment) return null;
    return attachment;
  }

  async getAttachments(userId: string) {
    const attachments = await this.prismaService.attachment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return attachments.map((att) => this.formatAttachment(att));
  }

  async getAttachmentById(id: string) {
    const attachment = await this.prismaService.attachment.findUnique({
      where: { id },
    });
    return this.formatAttachment(attachment);
  }

  async createAttachment(userId: string, formData: CreateAttachmentFormData) {
    const file = formData.file;
    const name = formData.name;
    const type = formData.type;
    const url = file
      ? await this.uploadService.uploadSingleFile(file, 'attachments/')
      : null;

    const attachment = await this.prismaService.attachment.create({
      data: {
        name,
        url,
        userId,
        type,
      },
    });
    return this.formatAttachment(attachment);
  }

  async editAttachment(id: string, name?: string, type?: AttachmentType) {
    const attachment = await this.prismaService.attachment.update({
      where: { id },
      data: {
        name,
        type,
      },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    const updatedAttachment = await this.prismaService.attachment.update({
      where: { id },
      data: { name },
    });
    return this.formatAttachment(updatedAttachment);
  }

  async deleteAttachment(id: string) {
    const attachment = await this.prismaService.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    const deletedAttachment = await this.prismaService.attachment.delete({
      where: { id },
    });
    return this.formatAttachment(deletedAttachment);
  }
}
