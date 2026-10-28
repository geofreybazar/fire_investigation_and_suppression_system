import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

// Refresh tokens are stored as SHA-256 hashes, so a leaked table can't be replayed.
function hashToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findUserByAccountNumber(accountNumber: string) {
    return this.prismaService.user.findUnique({
      where: {
        account_number: accountNumber,
      },
    });
  }

  async findUserById(userId: string) {
    return this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async createRefreshToken(userId: string, refreshToken: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prismaService.refreshToken.create({
      data: {
        refreshToken: hashToken(refreshToken),
        userId: userId,
        expiresAt,
      },
    });
  }

  async findRefreshToken(refreshToken: string) {
    return this.prismaService.refreshToken.findUnique({
      where: {
        refreshToken: hashToken(refreshToken),
      },
      include: {
        user: true,
      },
    });
  }

  async deleteRefreshToken(id: string) {
    return this.prismaService.refreshToken.delete({
      where: {
        id,
      },
    });
  }
}
