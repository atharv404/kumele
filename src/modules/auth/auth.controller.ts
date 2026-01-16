import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { PasskeyService } from './services/passkey.service';

import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';

import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import {
  PasskeyRegistrationStartDto,
  PasskeyRegistrationFinishDto,
  PasskeyLoginStartDto,
  PasskeyLoginFinishDto,
} from './dto/passkey.dto';

import { User } from '@prisma/client';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passkeyService: PasskeyService,
  ) {}

  // ==================== Email/Password Auth ====================

  @Post('signup')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@CurrentUser() user: User): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    return { message: 'Successfully logged out' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Successfully logged out from all devices' })
  async logoutAll(@CurrentUser() user: User): Promise<{ message: string }> {
    await this.authService.logoutAll(user.id);
    return { message: 'Successfully logged out from all devices' };
  }

  // ==================== Token Refresh ====================

  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully refreshed',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  // ==================== Google OAuth ====================

  @Get('google')
  @Public()
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @Public()
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with Google' })
  async googleAuthCallback(
    @Req() req: { user: User },
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.authService.googleLogin(req.user);
    
    // In production, redirect to frontend with tokens in URL params or set cookies
    // For API testing, return JSON response
    res.json(result);
  }

  // ==================== Passkey / WebAuthn ====================

  @Post('passkey/register/start')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Start passkey registration' })
  @ApiBody({ type: PasskeyRegistrationStartDto })
  @ApiResponse({ status: 200, description: 'Registration options generated' })
  async passkeyRegistrationStart(
    @CurrentUser() user: User,
    @Body() dto: PasskeyRegistrationStartDto,
  ) {
    return this.passkeyService.generateRegistrationOptions(user, dto.deviceName);
  }

  @Post('passkey/register/finish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Complete passkey registration' })
  @ApiBody({ type: PasskeyRegistrationFinishDto })
  @ApiResponse({ status: 201, description: 'Passkey successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid registration response' })
  async passkeyRegistrationFinish(
    @CurrentUser() user: User,
    @Body() dto: PasskeyRegistrationFinishDto,
  ) {
    return this.passkeyService.verifyRegistrationResponse(user, dto);
  }

  @Post('passkey/login/start')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start passkey login' })
  @ApiBody({ type: PasskeyLoginStartDto })
  @ApiResponse({ status: 200, description: 'Authentication options generated' })
  async passkeyLoginStart(@Body() dto: PasskeyLoginStartDto) {
    return this.passkeyService.generateAuthenticationOptions(dto.email);
  }

  @Post('passkey/login/finish')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete passkey login' })
  @ApiBody({ type: PasskeyLoginFinishDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated with passkey',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid passkey' })
  async passkeyLoginFinish(@Body() dto: PasskeyLoginFinishDto): Promise<AuthResponseDto> {
    return this.passkeyService.verifyAuthenticationResponse(dto);
  }

  // ==================== User Info ====================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  async me(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }
}
