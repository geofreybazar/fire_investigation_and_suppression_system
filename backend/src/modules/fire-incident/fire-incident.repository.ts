import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class FireIncidientRepository {
  constructor(private readonly prismaService: PrismaService) {}
}
