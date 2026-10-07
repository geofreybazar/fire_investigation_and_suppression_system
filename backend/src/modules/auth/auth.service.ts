import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';

import { LoginInput } from '../users/schema/user.schema.js';
import { AuthRepository } from './auth.repository.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  async login(loginData: LoginInput) {
    this.logger.log(`Logging in user: ${loginData.account_number}`);

    const user = await this.authRepository.findUserByAccountNumber(
      loginData.account_number,
    );

    const passwordCorrect =
      user === null
        ? false
        : await bcrypt.compare(loginData.password, user.password);

    if (!user || !passwordCorrect) {
      this.logger.error(
        `User not found or invalid credentials: ${loginData.account_number}`,
      );
      throw new UnauthorizedException('Invalid account number or password');
    }

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('REFRESH_SECRET');

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        account_number: user.account_number,
        role: user.role,
        positionId: user.positionId,
        officeId: user.officeId,
      },
      {
        secret: jwtSecret,
        expiresIn: '15m',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        account_number: user.account_number,
        role: user.role,
        positionId: user.positionId,
        officeId: user.officeId,
      },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );

    await this.authRepository.createRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  async logout(refreshToken: string) {
    this.logger.log('User is logging out');
    const refreshSecret = this.configService.get<string>('REFRESH_SECRET');

    try {
      // validating refreshtoken related to user
      const storedToken =
        await this.authRepository.findRefreshToken(refreshToken);

      if (!storedToken) {
        throw new NotFoundException('User or refreshtoken is invalid');
      }

      // delete the previous token
      await this.authRepository.deleteRefreshToken(storedToken.id);

      this.logger.log(`${storedToken.user.account_number} user logged out`);

      return {
        message: 'Logged out successfully',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid User');
    }
  }

  async refresh(refreshToken: string) {
    this.logger.log('Refreshing acces token');
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('REFRESH_SECRET');

    try {
      // verifying valid refreshToken
      const decodedToken = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.authRepository.findUserById(decodedToken.sub);

      // validating refreshtoken related to user
      const storedToken =
        await this.authRepository.findRefreshToken(refreshToken);

      if (!user || !storedToken || !decodedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // create new access tokens
      const newAccessToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          account_number: user.account_number,
          role: user.role,
          positionId: user.positionId,
          officeId: user.officeId,
        },
        {
          secret: jwtSecret,
          expiresIn: '15m',
        },
      );

      const newRefreshToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          account_number: user.account_number,
          role: user.role,
          positionId: user.positionId,
          officeId: user.officeId,
        },
        {
          secret: refreshSecret,
          expiresIn: '7d',
        },
      );

      // store new refresh token
      await this.authRepository.createRefreshToken(user.id, newRefreshToken);

      // delete the previous token
      await this.authRepository.deleteRefreshToken(storedToken.id);

      this.logger.log('Refreshing token successful');

      return { newAccessToken, newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh token');
    }
  }
}
