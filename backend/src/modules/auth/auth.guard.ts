import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { Request } from 'express';
import { TokenExpiredException } from '../../exceptions/tokenExpired.exception.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token = request.cookies?.access_token;

    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!token) {
      throw new TokenExpiredException(
        'TOKEN_EXPIRED',
        'Access token is expired',
      );
    }

    if (!jwtSecret) {
      throw new Error('JWT secret is not configured');
    }

    try {
      const user = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });

      request.user = user;

      return true;
    } catch (error: unknown) {
      throw new TokenExpiredException(
        'TOKEN_EXPIRED',
        'Access token is expired',
      );
    }
  }
}
