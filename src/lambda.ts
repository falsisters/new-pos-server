import { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cors from 'cors';
import { ValidationPipe } from '@nestjs/common';

const server = express();
let isNestAppInitialized = false;

// Add CORS middleware to the Express server directly
server.use(
  cors({
    origin: '*', // Or specify your exact origins like: ['https://falsisters-pos-android-jn2aqd4pu-tatayless-projects.vercel.app']
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

// Handle OPTIONS requests explicitly
server.options('*', (req, res) => {
  res.status(204).end();
});

// Bootstraps the NestJS application using the Express adapter.
async function bootstrap() {
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );

  // Configure global pipes or other settings
  nestApp.useGlobalPipes(new ValidationPipe());

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
