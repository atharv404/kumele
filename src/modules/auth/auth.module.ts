import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { PasskeyService } from './services/passkey.service';
import { GoogleOAuthService } from './services/google-oauth.service';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<number>('JWT_ACCESS_EXPIRATION', 900), // 15 minutes
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    PasswordService,
    PasskeyService,
    GoogleOAuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, TokenService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
