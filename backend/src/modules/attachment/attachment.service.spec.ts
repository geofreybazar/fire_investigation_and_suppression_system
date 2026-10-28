import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { type UUID } from 'crypto';
import { AttachmentService } from './attachment.service.js';
import { AttachmentRepository } from './attachment.repository.js';
import { AttachmentStorage } from './attachment.storage.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';

const STATION = 'station-1';
const OTHER_STATION = 'station-2';
const incidentId = 'incident-1';
const investigationId = 'investigation-1';

const userWith = (
  role: CurrentUserJwtPayload['role'],
  officeId = STATION,
  sub = '11111111-1111-4111-8111-111111111111',
): CurrentUserJwtPayload => ({
  sub: sub as UUID,
  account_number: 'ACC001',
  role,
  positionId: 'position-1',
  officeId,
});

const staff = userWith('CITY_MUNICIPALITY_OPERATION_STAFF');
const investigator = userWith(
  'CITY_MUNICIPALITY_INVESTIGATOR',
  STATION,
  '22222222-2222-4222-8222-222222222222',
);

const incident = (overrides: Record<string, unknown> = {}) => ({
  id: incidentId,
  incidentNo: '2026-03-NCR-000001',
  officeId: STATION,
  approvalStatus: 'APPROVED',
  deletedAt: null,
  office: { id: STATION, parentId: 'district-1', regionId: 'region-1' },
  ...overrides,
});

const pdf = {
  originalname: 'scene report.pdf',
  size: 9,
  buffer: Buffer.from('%PDF-1.7\n'),
};

describe('AttachmentService', () => {
  let service: AttachmentService;
  let repository: Record<string, ReturnType<typeof vi.fn>>;
  let storage: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    repository = {
      findOfficeType: vi.fn((officeId: string) =>
        Promise.resolve({ id: officeId, type: 'CITY_FIRE_STATION' }),
      ),
      findIncident: vi.fn().mockResolvedValue(incident()),
      findInvestigation: vi.fn().mockResolvedValue({
        id: investigationId,
        investigationNo: 'INV-1',
        fireIncidentId: incidentId,
        assignedInvestigatorId: investigator.sub,
        completedAt: null,
        fireIncident: incident(),
      }),
      create: vi.fn((data) => Promise.resolve({ id: 'att-1', ...data })),
      findById: vi.fn(),
      listForIncident: vi.fn().mockResolvedValue([]),
      listForInvestigation: vi.fn().mockResolvedValue([]),
      findPaginated: vi.fn().mockResolvedValue({ attachments: [], total: 0 }),
      softRemove: vi.fn().mockResolvedValue(true),
      recordDownload: vi.fn(),
    };
    storage = {
      save: vi.fn().mockResolvedValue('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      open: vi.fn().mockReturnValue('stream'),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentService,
        { provide: AttachmentRepository, useValue: repository },
        { provide: AttachmentStorage, useValue: storage },
      ],
    }).compile();

    service = module.get<AttachmentService>(AttachmentService);
  });

  describe('uploading to an incident', () => {
    it('stores the file with the detected type, size and hash', async () => {
      await service.uploadToIncident(incidentId, pdf, {}, staff);

      expect(storage.save).toHaveBeenCalledWith(pdf.buffer);
      expect(repository.create).toHaveBeenCalledWith({
        fireIncidentId: incidentId,
        uploadedById: staff.sub,
        originalName: 'scene report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 9,
        storageKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        description: null,
      });
    });

    it("forbids staff of another station even when they can't see it", async () => {
      await expect(
        service.uploadToIncident(
          incidentId,
          pdf,
          {},
          userWith('CITY_MUNICIPALITY_OPERATION_STAFF', OTHER_STATION),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('forbids viewers who are not station editors', async () => {
      await expect(
        service.uploadToIncident(
          incidentId,
          pdf,
          {},
          userWith('CITY_MUNICIPALITY_OPERATION'),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('rejects a missing or empty file', async () => {
      await expect(
        service.uploadToIncident(incidentId, undefined, {}, staff),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadToIncident(
          incidentId,
          { ...pdf, size: 0, buffer: Buffer.alloc(0) },
          {},
          staff,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a file whose content is not an allowed type, whatever its name', async () => {
      await expect(
        service.uploadToIncident(
          incidentId,
          { originalname: 'photo.jpg', size: 6, buffer: Buffer.from('<html>') },
          {},
          staff,
        ),
      ).rejects.toThrow(UnsupportedMediaTypeException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('deletes the stored file if the database write fails', async () => {
      repository.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.uploadToIncident(incidentId, pdf, {}, staff),
      ).rejects.toThrow('db down');
      expect(storage.delete).toHaveBeenCalledWith(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      );
    });

    it('hides a deleted incident', async () => {
      repository.findIncident.mockResolvedValue(
        incident({ deletedAt: new Date() }),
      );

      await expect(
        service.uploadToIncident(incidentId, pdf, {}, staff),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploading evidence to an investigation', () => {
    it('lets the assigned investigator add evidence', async () => {
      await service.uploadToInvestigation(
        investigationId,
        pdf,
        {},
        investigator,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fireIncidentId: incidentId,
          investigationId,
          uploadedById: investigator.sub,
        }),
      );
    });

    it('forbids anyone else', async () => {
      await expect(
        service.uploadToInvestigation(
          investigationId,
          pdf,
          {},
          userWith('CITY_MUNICIPALITY_CHIEF_INVESTIGATOR'),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses evidence once the investigation is approved', async () => {
      repository.findInvestigation.mockResolvedValue({
        id: investigationId,
        investigationNo: 'INV-1',
        fireIncidentId: incidentId,
        assignedInvestigatorId: investigator.sub,
        completedAt: new Date(),
        fireIncident: incident(),
      });

      await expect(
        service.uploadToInvestigation(investigationId, pdf, {}, investigator),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('downloading and removing', () => {
    const stored = (overrides: Record<string, unknown> = {}) => ({
      id: 'att-1',
      fireIncidentId: incidentId,
      investigationId: null,
      originalName: 'scene report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 9,
      storageKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      removedAt: null,
      uploadedBy: { id: staff.sub },
      fireIncident: incident(),
      investigation: null,
      ...overrides,
    });

    it('audits every download', async () => {
      repository.findById.mockResolvedValue(stored());

      const result = await service.download('att-1', investigator);

      expect(repository.recordDownload).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'att-1' }),
        { officeId: STATION, regionId: 'region-1' },
        investigator.sub,
      );
      expect(result.stream).toBe('stream');
    });

    it('treats removed and out-of-scope files as missing', async () => {
      repository.findById.mockResolvedValue(stored({ removedAt: new Date() }));
      await expect(service.download('att-1', staff)).rejects.toThrow(
        NotFoundException,
      );

      repository.findById.mockResolvedValue(stored());
      await expect(
        service.download(
          'att-1',
          userWith('CITY_MUNICIPALITY_INVESTIGATOR', OTHER_STATION),
        ),
      ).rejects.toThrow(NotFoundException);
      expect(repository.recordDownload).not.toHaveBeenCalled();
    });

    it('lets only the uploader remove a file', async () => {
      repository.findById.mockResolvedValue(stored());

      await expect(service.remove('att-1', investigator)).rejects.toThrow(
        ForbiddenException,
      );
      await service.remove('att-1', staff);
      expect(repository.softRemove).toHaveBeenCalledWith('att-1', staff.sub);
    });

    it('keeps evidence of an approved investigation', async () => {
      repository.findById.mockResolvedValue(
        stored({
          investigationId,
          uploadedBy: { id: investigator.sub },
          investigation: { completedAt: new Date() },
        }),
      );

      await expect(service.remove('att-1', investigator)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  it('lists only attachments on incidents in scope', async () => {
    await service.findPaginated({ page: 1, kind: 'investigation' }, staff);

    expect(repository.findPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        removedAt: null,
        investigationId: { not: null },
        fireIncident: expect.objectContaining({ deletedAt: null }),
      }),
      0,
      20,
    );
  });
});
