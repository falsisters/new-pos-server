import { Controller, Get, Delete, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { StorageService } from './storage.service';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Get('usage')
  async getUsage() {
    return this.storageService.getUsage();
  }

  @Get('export')
  async exportStorage(@Res() res: Response) {
    const buffer = await this.storageService.exportStorage();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="falsisters-storage-export.zip"`,
    );
    res.send(buffer);
  }

  @Delete('clear')
  async clearStorage() {
    return this.storageService.clearStorage();
  }

  @Get('db-usage')
  async getDatabaseUsage() {
    return this.storageService.getDatabaseUsage();
  }
}
