import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { JwtCashierAuthGuard } from 'src/cashier/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('attachment')
export class AttachmentController {
  constructor(private attachmentService: AttachmentService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get()
  async getAllAttachments(@Request() req) {
    const userId = req.user.userId;
    return this.attachmentService.getAttachments(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getAllUserAttachments(@Request() req) {
    const userId = req.user.id;
    return this.attachmentService.getAttachments(userId);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get(':id')
  async getAttachmentById(@Param('id') id: string) {
    return this.attachmentService.getAttachmentById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:id')
  async getUserAttachmentById(@Param('id') id: string) {
    return this.attachmentService.getAttachmentById(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
        fieldSize: 15 * 1024 * 1024, // 15MB
      },
      fileFilter: (req, file, callback) => {
        // Allow more file types for attachments including enhanced image formats
        const allowedMimeTypes = [
          // Images
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
          // Documents
          'application/pdf',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/msword',
          'application/vnd.ms-excel',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'File type not supported. Please upload images, PDFs, or Office documents.',
            ),
            false,
          );
        }
      },
    }),
  )
  @Post('create')
  async createAttachment(
    @Request() req,
    @Body() formData: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user.userId;
    return this.attachmentService.createAttachment(userId, {
      ...formData,
      file,
    });
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB
        fieldSize: 15 * 1024 * 1024, // 15MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          // Images
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
          // Documents
          'application/pdf',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/msword',
          'application/vnd.ms-excel',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new Error(
              'File type not supported. Please upload images, PDFs, or Office documents.',
            ),
            false,
          );
        }
      },
    }),
  )
  @Post('user/create')
  async createUserAttachment(
    @Request() req,
    @Body() formData: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user.id;
    return this.attachmentService.createAttachment(userId, {
      ...formData,
      file,
    });
  }

  @UseGuards(JwtCashierAuthGuard)
  @Patch(':id')
  async editAttachment(
    @Request() req,
    @Body() name: string,
    @Param('id') id: string,
  ) {
    return this.attachmentService.editAttachment(id, name);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/:id')
  async editUserAttachment(
    @Request() req,
    @Body() name: string,
    @Param('id') id: string,
  ) {
    return this.attachmentService.editAttachment(id, name);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Delete(':id')
  async deleteAttachment(@Request() req, @Param('id') id: string) {
    return this.attachmentService.deleteAttachment(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('user/:id')
  async deleteUserAttachment(@Request() req, @Param('id') id: string) {
    return this.attachmentService.deleteAttachment(id);
  }
}
