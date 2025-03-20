import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { log } from './vite';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    
    // CORS configuration
    app.enableCors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    });

    // Start server on port 5000
    await app.listen(5000, '0.0.0.0');
    log('Server is running on port 5000');
  } catch (error) {
    log('Error starting server:', error);
    process.exit(1);
  }
}

bootstrap();
