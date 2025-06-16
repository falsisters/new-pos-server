import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure body parser limits - increased for multipart form data overhead
  app.use(require('express').json({ limit: '15mb' }));
  app.use(require('express').urlencoded({ limit: '15mb', extended: true }));
  app.use(require('express').raw({ limit: '15mb' }));

  app.enableCors({
    origin: ['*'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
