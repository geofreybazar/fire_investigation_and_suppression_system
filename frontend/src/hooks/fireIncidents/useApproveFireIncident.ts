import { useMutation, useQueryClient } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

const useApproveFireIncident = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: approveFireIncident, isPending } = useMutation({
    mutationFn: fireIncidentService.approveFireIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["fireIncident"] });
      queryClient.invalidateQueries({ queryKey: ["deletedFireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["investigationCase"] });
      showToast({
        title: "Incident Approved",
        description: "The incident has been approved and numbered.",
        type: "success",
        priority: "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not approve the incident",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { approveFireIncident, isPending };
};

export default useApproveFireIncident;
