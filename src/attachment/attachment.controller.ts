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

@Controller('attachment')
export class AttachmentController {
  constructor(private attachmentService: AttachmentService) {}

  @UseGuards(JwtCashierAuthGuard)
  @Get()
  async getAllAttachments(@Request() req) {
    const userId = req.user.userId;
    return this.attachmentService.getAttachments(userId);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Get(':id')
  async getAttachmentById(@Param('id') id: string) {
    return this.attachmentService.getAttachmentById(id);
  }

  @UseGuards(JwtCashierAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
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

  @UseGuards(JwtCashierAuthGuard)
  @Patch(':id')
  async editAttachment(@Request() req, @Body() name: string) {
    const id = req.params.id;
    return this.attachmentService.editAttachment(id, name);
  }

  @UseGuards(JwtCashierAuthGuard)
  @Delete(':id')
  async deleteAttachment(@Request() req) {
    const id = req.params.id;
    return this.attachmentService.deleteAttachment(id);
  }
}
