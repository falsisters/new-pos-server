import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { CreateAttachmentFormData } from './types/createAttachment.type';
import { AttachmentType } from '@prisma/client';
import {
  formatDateForClient,
  createManilaDateFilter,
} from 'src/utils/date.util';

@Injectable()
export class AttachmentService {
  constructor(
    private prismaService: PrismaService,
    private uploadService: UploadService,
  ) {}

  private formatAttachment(attachment: any) {
    if (!attachment) return null;
    return {
      ...attachment,
      createdAt: formatDateForClient(attachment.createdAt),
      updatedAt: formatDateForClient(attachment.updatedAt),
    };
  }

  async getAttachments(userId: string) {
    // Use timezone-aware date filtering for "today"
    const todayFilter = createManilaDateFilter();

    const attachments = await this.prismaService.attachment.findMany({
      where: {
        userId,
        createdAt: todayFilter,
      },
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

    return this.formatAttachment(attachment);
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

  async getYesterdayAttachments() {
    // Get yesterday's date in YYYY-MM-DD format
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDateString = yesterday.toISOString().split('T')[0];

    // Use timezone-aware date filtering for yesterday
    const yesterdayFilter = createManilaDateFilter(yesterdayDateString);

    const attachments = await this.prismaService.attachment.findMany({
      where: {
        createdAt: yesterdayFilter,
      },
    });

    return attachments;
  }

  async deleteYesterdayAttachments() {
    try {
      const yesterdayAttachments = await this.getYesterdayAttachments();

      if (yesterdayAttachments.length === 0) {
        return {
          message: 'No attachments found from yesterday',
          deletedCount: 0,
        };
      }

      // Delete files from storage first
      const deletePromises = yesterdayAttachments.map(async (attachment) => {
        if (attachment.url) {
          await this.uploadService.deleteFileFromStorage(attachment.url);
        }
      });

      await Promise.allSettled(deletePromises);

      // Delete attachments from database
      const deletedAttachments = await this.prismaService.attachment.deleteMany(
        {
          where: {
            id: {
              in: yesterdayAttachments.map((att) => att.id),
            },
          },
        },
      );

      return {
        message: `Successfully deleted ${deletedAttachments.count} attachments from yesterday`,
        deletedCount: deletedAttachments.count,
        deletedAttachments: yesterdayAttachments.map((att) => ({
          id: att.id,
          name: att.name,
          url: att.url,
          createdAt: formatDateForClient(att.createdAt),
        })),
      };
    } catch (error) {
      console.error('Error deleting yesterday attachments:', error);
      throw new Error(
        `Failed to delete yesterday's attachments: ${error.message}`,
      );
    }
  }
}
