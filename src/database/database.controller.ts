import {
  Controller,
  Delete,
  Get,
  Request,
  UseGuards,
  Res,
} from '@nestjs/common';
import { DatabaseService } from './database.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { Response } from 'express';

@Controller('database')
export class DatabaseController {
  constructor(private databaseService: DatabaseService) {}

  @UseGuards(JwtAuthGuard)
  @Delete('clear')
  async clearDatabase(@Request() req) {
    const userId = req.user.id;
    return this.databaseService.clearDatabase(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export')
  async exportDatabase(@Request() req, @Res() res: Response) {
    const userId = req.user.id;
    const zipBuffer = await this.databaseService.exportDatabase(userId);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `database-export-${timestamp}.zip`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': zipBuffer.length,
    });

    res.send(zipBuffer);
  }
}
