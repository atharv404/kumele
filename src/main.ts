import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  // Render uses PORT, fallback to APP_PORT for local dev
  const port = configService.get<number>('PORT') || configService.get<number>('APP_PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  // Security middleware - configure helmet to allow Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kumele API')
    .setDescription(
      `
      ## Kumele Backend API Documentation
      
      Kumele is a social meetup/hobby matching application - "Tinder for events".
      
      ### Features:
      - User authentication (JWT, Google OAuth, Passkeys)
      - Event creation and management
      - Location-based matching
      - Real-time chat
      - Payment processing (Stripe, PayPal, Crypto)
      - Reward system (Bronze/Silver/Gold badges)
      
      ### Authentication:
      Most endpoints require a Bearer token in the Authorization header.
      Use \`/auth/login\` or \`/auth/signup\` to obtain tokens.
    `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User profile management')
    .addTag('Events', 'Event management')
    .addTag('Hobbies', 'Hobby categories and preferences')
    .addTag('Payments', 'Payment processing')
    .addTag('Chat', 'Real-time chat')
    .addTag('Blogs', 'Blog posts and comments')
    .addTag('Notifications', 'Push notifications')
    .addTag('Ads', 'Advertisement system')
    .addTag('Admin', 'Admin-only endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  // Listen on 0.0.0.0 for Render.com (not just localhost)
  await app.listen(port, '0.0.0.0');

  const appUrl = configService.get<string>('APP_URL') || `http://localhost:${port}`;
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║   🚀 Kumele API Server Started Successfully!               ║
  ║                                                            ║
  ║   🌍 Environment: ${nodeEnv.padEnd(40)}║
  ║   📍 Server:      ${appUrl.padEnd(39)}║
  ║   📚 API Docs:    ${(appUrl + '/docs').padEnd(39)}║
  ║   ❤️  Health:     ${(appUrl + '/' + apiPrefix + '/health').padEnd(39)}║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
