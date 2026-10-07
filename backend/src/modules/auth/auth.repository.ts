import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

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
        refreshToken: refreshToken,
        userId: userId,
        expiresAt,
      },
    });
  }

  async findRefreshToken(refreshToken: string) {
    return this.prismaService.refreshToken.findUnique({
      where: {
        refreshToken,
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
