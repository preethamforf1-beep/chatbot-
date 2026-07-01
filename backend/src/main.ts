import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  const port = config.get<number>('PORT') || 5000;
  await app.listen(port);
  console.log(`✅ HRMS Nest backend running on http://localhost:${port}`);
}
bootstrap();
