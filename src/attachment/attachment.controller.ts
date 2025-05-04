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

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
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
