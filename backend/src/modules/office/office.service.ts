import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OfficeInput } from './schema/office.schema.js';
import { OfficeType } from '../../generated/prisma/enums.js';
import { validateOfficeHierarchy } from './utils/office-heirarchy.validator.js';
import { UUID } from 'crypto';
import { OfficeAuthorizationService } from './services/office.authorization.service.js';
import { OfficeRepository } from './office.repository.js';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';

@Injectable()
export class OfficeService {
  private readonly logger = new Logger(OfficeService.name);

  constructor(
    private readonly officeRepository: OfficeRepository,
    private readonly officeAuthorizationService: OfficeAuthorizationService,
  ) {}

  async createOffice(officeData: OfficeInput, user: CurrentUserJwtPayload) {
    this.logger.log(`Creating office: ${officeData.name}`);

    this.officeAuthorizationService.canManageOffice(user, officeData.type);

    let parentOffice;

    if (officeData.parentId) {
      parentOffice = await this.officeRepository.findById(officeData.parentId);

      if (!parentOffice) {
        throw new NotFoundException('Parent office not found');
      }
    }

    validateOfficeHierarchy(officeData.type, parentOffice?.type);

    const office = await this.officeRepository.createOffice({
      name: officeData.name,
      type: officeData.type,
      parentId: officeData.parentId,
    });

    this.logger.log(`Office is created: ${office.name}`);

    return office;
  }

  async findPaginatedOffices(
    user: CurrentUserJwtPayload,
    page: number,
    search: string,
    officetype: OfficeType,
  ) {
    const limit = 10;
    const skip = (page - 1) * limit;

    const { offices, total } = await this.officeRepository.findPaginatedOffices(
      user,
      skip,
      limit,
      search,
      officetype,
    );

    return {
      data: offices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllOffices(user: CurrentUserJwtPayload) {
    return await this.officeRepository.findAllOffices(user);
  }

  async updateOffice(
    id: UUID,
    officeData: OfficeInput,
    user: CurrentUserJwtPayload,
  ) {
    this.logger.log(`Updating Office ${officeData.name}`);

    this.officeAuthorizationService.canManageOffice(user, officeData.type);

    let parentOffice;

    if (officeData.parentId) {
      parentOffice = await this.officeRepository.findById(officeData.parentId);

      if (!parentOffice) {
        throw new NotFoundException('Parent office not found');
      }
    }

    validateOfficeHierarchy(officeData.type, parentOffice?.type);

    const updatedOffice = await this.officeRepository.updateOffice(
      id,
      officeData,
    );

    this.logger.log('Updating office successful');

    return updatedOffice;
  }

  async deleteOffice(officeId: UUID) {
    const office = await this.officeRepository.findByIdForDeletion(officeId);

    if (!office) {
      throw new NotFoundException('Office not found.');
    }

    if (office._count.users > 0) {
      throw new ConflictException(
        'This office cannot be deleted because it has assigned users.',
      );
    }

    if (office._count.children > 0) {
      throw new ConflictException(
        'This office cannot be deleted because it has child offices.',
      );
    }

    await this.officeRepository.deleteById(officeId);

    return {
      message: 'Office deleted successfully.',
    };
  }
}
