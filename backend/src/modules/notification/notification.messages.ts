import {
  FireIncidentStatus,
  NotificationEntityType,
  NotificationType,
} from '../../generated/prisma/enums.js';

// Wording of each workflow notification (REQUIREMENTS.md Q-21). Pending
// incidents have no number yet, so incident messages avoid relying on it.

interface Message {
  type: NotificationType;
  title: string;
  body: string;
  entityType: NotificationEntityType;
  entityId: string;
}

const statusLabel = (status: FireIncidentStatus) =>
  status.replace(/_/g, ' ').toLowerCase();

const incident = (
  type: NotificationType,
  id: string,
  title: string,
  body: string,
): Message => ({
  type,
  title,
  body,
  entityType: 'FIRE_INCIDENT',
  entityId: id,
});

const investigation = (
  type: NotificationType,
  id: string,
  title: string,
  body: string,
): Message => ({
  type,
  title,
  body,
  entityType: 'INVESTIGATION',
  entityId: id,
});

export const notificationMessages = {
  incidentSubmitted: (id: string) =>
    incident(
      'INCIDENT_SUBMITTED',
      id,
      'Incident awaiting approval',
      'A fire incident from your station was submitted and needs your approval.',
    ),

  incidentResubmitted: (id: string) =>
    incident(
      'INCIDENT_RESUBMITTED',
      id,
      'Incident resubmitted',
      'A rejected fire incident was corrected and resubmitted for your approval.',
    ),

  incidentApproved: (id: string, incidentNo: string) =>
    incident(
      'INCIDENT_APPROVED',
      id,
      'Incident approved',
      `Your fire incident was approved as ${incidentNo}.`,
    ),

  incidentRejected: (id: string, remarks: string) =>
    incident(
      'INCIDENT_REJECTED',
      id,
      'Incident rejected',
      `Your fire incident was rejected: ${remarks}`,
    ),

  incidentInvestigable: (
    id: string,
    incidentNo: string,
    status: FireIncidentStatus,
  ) =>
    incident(
      'INCIDENT_INVESTIGABLE',
      id,
      'Incident ready for an investigation decision',
      `Fire incident ${incidentNo} is now ${statusLabel(status)}. Decide whether to start an investigation or refer the case.`,
    ),

  caseReferred: (incidentId: string, incidentNo: string) =>
    incident(
      'CASE_REFERRED',
      incidentId,
      'Case referred to your office',
      `The investigation case for fire incident ${incidentNo} was referred to your office.`,
    ),

  investigatorAssigned: (id: string, investigationNo: string) =>
    investigation(
      'INVESTIGATOR_ASSIGNED',
      id,
      'Investigation assigned to you',
      `You are assigned investigation ${investigationNo}.`,
    ),

  reportSubmitted: (id: string, investigationNo: string) =>
    investigation(
      'REPORT_SUBMITTED',
      id,
      'Report submitted for review',
      `The report for investigation ${investigationNo} is ready for your review.`,
    ),

  reportApproved: (id: string, investigationNo: string) =>
    investigation(
      'REPORT_APPROVED',
      id,
      'Report approved',
      `Your report for investigation ${investigationNo} was approved.`,
    ),

  reportRejected: (
    id: string,
    investigationNo: string,
    remarks?: string | null,
  ) =>
    investigation(
      'REPORT_REJECTED',
      id,
      'Report returned for changes',
      `Your report for investigation ${investigationNo} was rejected${remarks ? `: ${remarks}` : '.'}`,
    ),
};
