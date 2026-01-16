import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { JwtPayload } from '../services/token.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    const secretOrKey = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secretOrKey) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey,
      passReqToCallback: true as const,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.body.refreshToken;
    return { ...payload, refreshToken };
  }
}
