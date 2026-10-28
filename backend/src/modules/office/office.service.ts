import {
  BadRequestException,
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
import {
  normalizeRegionCode,
  validateRegionCode,
} from './utils/validateRegionCode.js';

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

      this.officeAuthorizationService.assertOfficeInScope(user, parentOffice);
    }

    validateOfficeHierarchy(officeData.type, parentOffice?.type);

    validateRegionCode(officeData.type, officeData.regionCode);

    await this.assertNameAvailable(officeData);

    const office = await this.officeRepository.createOffice({
      name: officeData.name,
      type: officeData.type,
      parentId: officeData.parentId,
      regionCode: officeData.regionCode,
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

    const office = await this.officeRepository.findById(id);

    if (!office) {
      throw new NotFoundException('Office not found.');
    }

    // The actor must be allowed to manage the office as it is now, and as it will be.
    this.officeAuthorizationService.canManageOffice(user, office.type);
    this.officeAuthorizationService.assertOfficeInScope(user, office);
    this.officeAuthorizationService.canManageOffice(user, officeData.type);

    let parentOffice;

    if (officeData.parentId) {
      parentOffice = await this.officeRepository.findById(officeData.parentId);

      if (!parentOffice) {
        throw new NotFoundException('Parent office not found');
      }

      this.officeAuthorizationService.assertOfficeInScope(user, parentOffice);
    }

    validateOfficeHierarchy(officeData.type, parentOffice?.type);

    validateRegionCode(officeData.type, officeData.regionCode);

    await this.assertNameAvailable(officeData, id);

    // Issued incident numbers embed the code, so it is frozen once used.
    if (
      office.regionCode &&
      office.regionCode !== normalizeRegionCode(officeData.regionCode) &&
      (await this.officeRepository.isRegionCodeUsed(office.regionCode))
    ) {
      throw new ConflictException(
        'The region code cannot be changed because incident numbers already use it.',
      );
    }

    const updatedOffice = await this.officeRepository.updateOffice(
      id,
      officeData,
    );

    this.logger.log('Updating office successful');

    return updatedOffice;
  }

  async deleteOffice(officeId: UUID, user: CurrentUserJwtPayload) {
    const office = await this.officeRepository.findByIdForDeletion(officeId);

    if (!office) {
      throw new NotFoundException('Office not found.');
    }

    this.officeAuthorizationService.canManageOffice(user, office.type);
    this.officeAuthorizationService.assertOfficeInScope(user, office);

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

    // Incident ownership, case handling and investigation history must keep
    // their office, including for soft-deleted incidents.
    const { _count: counts } = office;
    if (
      counts.fireIncidents +
        counts.handledIncidentInvestigations +
        counts.conductedInvestigations +
        counts.referralsFrom +
        counts.referralsTo >
      0
    ) {
      throw new ConflictException(
        'This office cannot be deleted because it has fire incident or investigation records.',
      );
    }

    await this.officeRepository.deleteById(officeId);

    return {
      message: 'Office deleted successfully.',
    };
  }

  // Office names are unique under the same parent office (case-insensitive).
  private async assertNameAvailable(officeData: OfficeInput, excludeId?: UUID) {
    const existing = await this.officeRepository.findByNameUnderParent(
      officeData.name,
      officeData.parentId ?? null,
      excludeId,
    );

    if (existing) {
      throw new ConflictException(
        `An office named "${officeData.name}" already exists under the same parent office.`,
      );
    }
  }
}
