import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  IncidentApprovalStatus,
  ReportDecision,
  ROLE,
} from '../../generated/prisma/enums.js';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { InvestigationRepository } from './investigation.repository.js';
import {
  type ReferCaseInput,
  type ReviewReportInput,
  type StartInvestigationInput,
  type UpdateInvestigationInput,
} from './schema/investigation.schema.js';
import {
  assertInvestigationConcluded,
  CHIEF_INVESTIGATOR_ROLES,
  investigationNumber,
  INVESTIGATOR_ROLES,
  referralDirection,
  referralTargets,
  REPORT_EDITABLE_STATUSES,
  stationChain,
} from './utils/investigation-rules.js';
import { INVESTIGABLE_STATUSES } from '../fire-incident/utils/incident-rules.js';
import {
  isIncidentVisible,
  type ViewerScope,
} from '../fire-incident/utils/incident-scope.js';

const PAGE_SIZE = 10;

type CaseIncident = NonNullable<
  Awaited<ReturnType<InvestigationRepository['findIncident']>>
>;
type AccessInvestigation = NonNullable<
  Awaited<ReturnType<InvestigationRepository['findForAccess']>>
>;

@Injectable()
export class InvestigationService {
  private readonly logger = new Logger(InvestigationService.name);

  constructor(
    private readonly investigationRepository: InvestigationRepository,
  ) {}

  // ----- Case handling on an incident -----

  // The incident's investigation case: who handles it, its referrals and
  // investigations, and what the current user can do next.
  async getCase(incidentId: string, user: CurrentUserJwtPayload) {
    const incident = await this.findVisibleIncident(incidentId, user);
    const chain = stationChain(incident.office);
    const handlingOfficeId = this.handlingOfficeId(incident);
    const { referrals, investigations } =
      await this.investigationRepository.findIncidentInvestigations(incidentId);

    const hasOpen = investigations.some((inv) => inv.completedAt === null);
    const canDecide =
      this.isHandlingChief(user, handlingOfficeId) &&
      this.isInvestigable(incident) &&
      !hasOpen;

    return {
      incidentId: incident.id,
      incidentNo: incident.incidentNo,
      fireIncidentStatus: incident.fireIncidentStatus,
      handlingOffice: chain.find((office) => office.id === handlingOfficeId),
      investigable: this.isInvestigable(incident),
      canDecide,
      referralTargets: canDecide
        ? referralTargets(chain, handlingOfficeId)
        : [],
      referrals,
      investigations,
    };
  }

  async findCandidates(incidentId: string, user: CurrentUserJwtPayload) {
    const incident = await this.findVisibleIncident(incidentId, user);
    const handlingOfficeId = this.handlingOfficeId(incident);
    this.assertHandlingChief(user, handlingOfficeId);

    return this.investigationRepository.findInvestigators(handlingOfficeId);
  }

  async refer(
    incidentId: string,
    input: ReferCaseInput,
    user: CurrentUserJwtPayload,
  ) {
    const incident = await this.findVisibleIncident(incidentId, user);
    const fromOfficeId = this.handlingOfficeId(incident);
    this.assertHandlingChief(user, fromOfficeId);
    this.assertInvestigable(incident);

    const direction = referralDirection(
      stationChain(incident.office),
      fromOfficeId,
      input.toOfficeId,
    );

    const referred = await this.investigationRepository.refer(incidentId, {
      fromOfficeId,
      toOfficeId: input.toOfficeId,
      direction,
      referredById: user.sub,
      remarks: input.remarks,
    });

    if (!referred) {
      throw new ConflictException(
        'The case cannot be referred while an investigation is open, or it has already moved.',
      );
    }

    this.logger.log(`Investigation case referred ${direction}: ${incidentId}`);

    return { message: 'Case referred.', direction };
  }

  async start(
    incidentId: string,
    input: StartInvestigationInput,
    user: CurrentUserJwtPayload,
  ) {
    const incident = await this.findVisibleIncident(incidentId, user);
    const handlingOfficeId = this.handlingOfficeId(incident);
    this.assertHandlingChief(user, handlingOfficeId);
    this.assertInvestigable(incident);

    const investigator = await this.investigationRepository.findUser(
      input.investigatorId,
    );

    if (
      !investigator ||
      !investigator.isActive ||
      !INVESTIGATOR_ROLES.includes(investigator.role) ||
      investigator.officeId !== handlingOfficeId
    ) {
      throw new BadRequestException(
        'The assignee must be an active investigator of the handling office.',
      );
    }

    // Approved incidents always have a number (checked by assertInvestigable).
    const incidentNo = incident.incidentNo as string;

    const investigation = await this.investigationRepository.start(
      incidentId,
      {
        incidentNo,
        conductingOfficeId: handlingOfficeId,
        assignedInvestigatorId: investigator.id,
        assignedById: user.sub,
      },
      (existing) => investigationNumber(incidentNo, existing),
    );

    if (!investigation) {
      throw new ConflictException(
        'An investigation is already open for this incident, or the case has moved.',
      );
    }

    this.logger.log(`Investigation started: ${investigation.investigationNo}`);

    return investigation;
  }

  // ----- The investigation itself -----

  async findOne(id: string, user: CurrentUserJwtPayload) {
    await this.findVisibleInvestigation(id, user);

    return this.investigationRepository.findDetail(id);
  }

  async updateDraft(
    id: string,
    input: UpdateInvestigationInput,
    user: CurrentUserJwtPayload,
  ) {
    const investigation = await this.findVisibleInvestigation(id, user);
    this.assertAssignedInvestigator(investigation, user);
    this.assertEditable(investigation);

    const { report, ...fields } = input;

    const saved = await this.investigationRepository.updateDraft(id, {
      investigation: fields,
      report,
    });

    if (!saved) {
      throw new ConflictException('The investigation can no longer be edited.');
    }

    return { message: 'Investigation saved.' };
  }

  async submit(id: string, user: CurrentUserJwtPayload) {
    const investigation = await this.findVisibleInvestigation(id, user);
    this.assertAssignedInvestigator(investigation, user);
    this.assertEditable(investigation);

    if (!investigation.report) {
      throw new BadRequestException('Write the report before submitting it.');
    }

    assertInvestigationConcluded(investigation);

    if (!(await this.investigationRepository.submitReport(id))) {
      throw new ConflictException('The report can no longer be submitted.');
    }

    return { message: 'Report submitted.' };
  }

  async review(
    id: string,
    input: ReviewReportInput,
    user: CurrentUserJwtPayload,
  ) {
    const investigation = await this.findVisibleInvestigation(id, user);
    this.assertHandlingChief(user, investigation.conductingOfficeId);

    if (input.decision === ReportDecision.APPROVED) {
      assertInvestigationConcluded(investigation);
    }

    const reviewed = await this.investigationRepository.review(
      id,
      input.decision,
      user.sub,
      input.remarks,
    );

    if (!reviewed) {
      throw new ConflictException(
        `The report cannot be marked ${input.decision} in its current state.`,
      );
    }

    this.logger.log(`Investigation report ${input.decision}: ${id}`);

    return {
      message: `Report ${input.decision.toLowerCase().replace('_', ' ')}.`,
    };
  }

  // ----- Work lists -----

  // Incidents whose investigation decisions sit with the chief's office.
  async findQueue(page: number, user: CurrentUserJwtPayload) {
    if (
      user.role !== ROLE.SUPER_ADMIN &&
      !CHIEF_INVESTIGATOR_ROLES.includes(user.role)
    ) {
      throw new ForbiddenException(
        'Only chief investigators have a case queue.',
      );
    }

    const { incidents, total } = await this.investigationRepository.findQueue(
      user.officeId,
      (page - 1) * PAGE_SIZE,
      PAGE_SIZE,
    );

    return this.page(incidents, total, page);
  }

  async findAssigned(page: number, user: CurrentUserJwtPayload) {
    const { investigations, total } =
      await this.investigationRepository.findAssigned(
        user.sub,
        (page - 1) * PAGE_SIZE,
        PAGE_SIZE,
      );

    return this.page(investigations, total, page);
  }

  // ----- Shared checks -----

  private async viewerScope(user: CurrentUserJwtPayload): Promise<ViewerScope> {
    const office = await this.investigationRepository.findOfficeType(
      user.officeId,
    );

    if (!office) {
      throw new ForbiddenException('Your office was not found.');
    }

    return { user, officeType: office.type };
  }

  // Investigations follow the incident's visibility; anything outside the
  // user's scope is a 404.
  private async findVisibleIncident(
    incidentId: string,
    user: CurrentUserJwtPayload,
  ): Promise<CaseIncident> {
    const scope = await this.viewerScope(user);
    const incident =
      await this.investigationRepository.findIncident(incidentId);

    if (!incident || !isIncidentVisible(incident, scope)) {
      throw new NotFoundException('Fire incident not found.');
    }

    return incident;
  }

  private async findVisibleInvestigation(
    id: string,
    user: CurrentUserJwtPayload,
  ): Promise<AccessInvestigation> {
    const scope = await this.viewerScope(user);
    const investigation = await this.investigationRepository.findForAccess(id);

    if (
      !investigation ||
      !isIncidentVisible(investigation.fireIncident, scope)
    ) {
      throw new NotFoundException('Investigation not found.');
    }

    return investigation;
  }

  // Until first referred, the owning station handles the case.
  private handlingOfficeId(incident: CaseIncident): string {
    return incident.investigationHandlingOfficeId ?? incident.officeId;
  }

  private isHandlingChief(user: CurrentUserJwtPayload, officeId: string) {
    return (
      user.role === ROLE.SUPER_ADMIN ||
      (CHIEF_INVESTIGATOR_ROLES.includes(user.role) &&
        user.officeId === officeId)
    );
  }

  private assertHandlingChief(user: CurrentUserJwtPayload, officeId: string) {
    if (!this.isHandlingChief(user, officeId)) {
      throw new ForbiddenException(
        "Only the handling office's chief investigator can do this.",
      );
    }
  }

  private isInvestigable(incident: CaseIncident) {
    return (
      incident.approvalStatus === IncidentApprovalStatus.APPROVED &&
      incident.incidentNo !== null &&
      INVESTIGABLE_STATUSES.includes(incident.fireIncidentStatus)
    );
  }

  private assertInvestigable(incident: CaseIncident) {
    if (!this.isInvestigable(incident)) {
      throw new BadRequestException(
        'Only an approved incident that is FIRE_OUT or FIRE_OUT_UPON_ARRIVAL can be investigated or referred.',
      );
    }
  }

  private assertAssignedInvestigator(
    investigation: AccessInvestigation,
    user: CurrentUserJwtPayload,
  ) {
    if (
      user.role !== ROLE.SUPER_ADMIN &&
      investigation.assignedInvestigatorId !== user.sub
    ) {
      throw new ForbiddenException(
        'Only the assigned investigator can change this investigation.',
      );
    }
  }

  private assertEditable(investigation: AccessInvestigation) {
    if (
      investigation.completedAt !== null ||
      (investigation.report &&
        !REPORT_EDITABLE_STATUSES.includes(investigation.report.status))
    ) {
      throw new ConflictException(
        'The investigation is locked while its report is under review or approved.',
      );
    }
  }

  private page<T>(data: T[], total: number, page: number) {
    return {
      data,
      pagination: {
        page,
        limit: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    };
  }
}
