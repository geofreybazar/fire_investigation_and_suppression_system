import { useMutation, useQueryClient } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

const useRestoreFireIncident = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: restoreFireIncident, isPending } = useMutation({
    mutationFn: fireIncidentService.restoreFireIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["fireIncident"] });
      queryClient.invalidateQueries({ queryKey: ["deletedFireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["investigationCase"] });
      showToast({
        title: "Incident Restored",
        description: "The incident and its records are visible again.",
        type: "success",
        priority: "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not restore the incident",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { restoreFireIncident, isPending };
};

export default useRestoreFireIncident;
