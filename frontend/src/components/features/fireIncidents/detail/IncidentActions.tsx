import { useState } from "react";
import { useNavigate } from "react-router";
import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import useApproveFireIncident from "@/hooks/fireIncidents/useApproveFireIncident";
import useRejectFireIncident from "@/hooks/fireIncidents/useRejectFireIncident";
import useResubmitFireIncident from "@/hooks/fireIncidents/useResubmitFireIncident";
import useRemoveFireIncident from "@/hooks/fireIncidents/useRemoveFireIncident";
import type { FireIncidentDetail } from "@/interface/fireIncident/fireIncident";
import {
  canEditIncident,
  isStationChiefOf,
  isSuperAdmin,
} from "@/utils/incidentPermissions";
import { Button } from "@/components/ui/button";
import NoButtonDialogComponent from "@/components/common/NoButtonDialogComponent";
import AlertDialogComponent from "@/components/common/AlertDialogComponent";
import ReasonForm from "../form/ReasonForm";
import DeleteIncidentForm from "../form/DeleteIncidentForm";
import EditIncidentForm from "../form/EditIncidentForm";

type OpenDialog = "edit" | "reject" | "delete" | "approve" | "remove" | null;

// The actions this user may take on the incident in its current state.
const IncidentActions = ({ incident }: { incident: FireIncidentDetail }) => {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [open, setOpen] = useState<OpenDialog>(null);

  const { approveFireIncident } = useApproveFireIncident();
  const { rejectFireIncident, isPending: isRejecting } = useRejectFireIncident();
  const { resubmitFireIncident, isPending: isResubmitting } =
    useResubmitFireIncident();
  const { removeFireIncident, isPending: isRemoving } = useRemoveFireIncident();

  const isEditor = canEditIncident(user, incident);
  const isChief = isStationChiefOf(user, incident);
  const superAdmin = isSuperAdmin(user);
  const pending = incident.approvalStatus === "PENDING";
  const rejected = incident.approvalStatus === "REJECTED";

  const close = () => setOpen(null);
  const ignoreError = () => {}; // The hooks already show the error.

  return (
    <div className='flex flex-wrap gap-2'>
      {isChief && pending && (
        <>
          <Button onClick={() => setOpen("approve")}>
            <Check className='size-4' />
            Approve
          </Button>
          <Button variant='outline' onClick={() => setOpen("reject")}>
            <X className='size-4' />
            Reject
          </Button>
        </>
      )}

      {isEditor && (
        <Button variant='outline' onClick={() => setOpen("edit")}>
          <Pencil className='size-4' />
          Edit details
        </Button>
      )}

      {isEditor && rejected && (
        <>
          <Button
            disabled={isResubmitting}
            onClick={() => resubmitFireIncident(incident.id).catch(ignoreError)}
          >
            <RotateCcw className='size-4' />
            Resubmit
          </Button>
          <Button variant='destructive' onClick={() => setOpen("remove")}>
            <Trash2 className='size-4' />
            Remove
          </Button>
        </>
      )}

      {superAdmin && (
        <Button variant='destructive' onClick={() => setOpen("delete")}>
          <Trash2 className='size-4' />
          Delete
        </Button>
      )}

      <AlertDialogComponent
        open={open === "approve"}
        setOpen={(isOpen) => !isOpen && close()}
        title='Approve this incident?'
        description='The incident gets its official number and becomes visible to the offices above your station.'
        action={{
          label: "Approve",
          onClick: () => {
            approveFireIncident(incident.id).catch(ignoreError);
            close();
          },
        }}
      />

      <AlertDialogComponent
        open={open === "remove"}
        setOpen={(isOpen) => !isOpen && close()}
        title='Remove this rejected incident?'
        description='It was never approved. It will be hidden, and only the super admin can restore it.'
        action={{
          label: isRemoving ? "Removing..." : "Remove",
          onClick: () => {
            removeFireIncident({ id: incident.id })
              .then(() => navigate("/fireincidents"))
              .catch(ignoreError);
            close();
          },
        }}
      />

      <NoButtonDialogComponent
        open={open === "reject"}
        modalOnChange={(isOpen) => !isOpen && close()}
        dialogTitle='Reject Incident'
        dialogDescription='The submitter can edit and resubmit it, or remove it.'
      >
        <ReasonForm
          label='Remarks'
          placeholder='What needs to be corrected?'
          submitLabel='Reject'
          destructive
          isPending={isRejecting}
          onSubmit={(remarks) =>
            rejectFireIncident({ id: incident.id, remarks })
              .then(close)
              .catch(ignoreError)
          }
        />
      </NoButtonDialogComponent>

      <NoButtonDialogComponent
        open={open === "delete"}
        modalOnChange={(isOpen) => !isOpen && close()}
        dialogTitle='Delete Incident'
        dialogDescription='The incident and all its records will be hidden. It can be restored from the Deleted tab.'
      >
        <DeleteIncidentForm
          isPending={isRemoving}
          onSubmit={({ reason, memoReference }) =>
            removeFireIncident({ id: incident.id, reason, memoReference })
              .then(() => navigate("/fireincidents"))
              .catch(ignoreError)
          }
        />
      </NoButtonDialogComponent>

      <NoButtonDialogComponent
        open={open === "edit"}
        modalOnChange={(isOpen) => !isOpen && close()}
        dialogTitle='Edit Incident Details'
        dialogDescription='Status and alarm changes are recorded on the timeline instead.'
        classname='sm:max-w-2xl'
      >
        <EditIncidentForm incident={incident} onDone={close} />
      </NoButtonDialogComponent>
    </div>
  );
};

export default IncidentActions;
