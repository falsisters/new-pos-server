import { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();
let isNestAppInitialized = false;

// Bootstraps the NestJS application using the Express adapter.
async function bootstrap() {
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );
  await nestApp.init();
  isNestAppInitialized = true;
}

// The exported handler for Vercel.
export default async (req: VercelRequest, res: VercelResponse) => {
  if (!isNestAppInitialized) {
    await bootstrap();
  }
  // Let the express server handle the request.
  server(req, res);
};
