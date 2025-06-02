import { Controller, Delete, Get, Request, UseGuards } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

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
  async exportDatabase(@Request() req) {
    const userId = req.user.id;
    return this.databaseService.exportDatabase(userId);
  }
}
