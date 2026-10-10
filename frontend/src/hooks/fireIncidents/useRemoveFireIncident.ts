import { useMutation, useQueryClient } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

const useRemoveFireIncident = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: removeFireIncident, isPending } = useMutation({
    mutationFn: fireIncidentService.removeFireIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["fireIncident"] });
      queryClient.invalidateQueries({ queryKey: ["deletedFireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["investigationCase"] });
      showToast({
        title: "Incident Deleted",
        description: "The incident and its records are now hidden.",
        type: "success",
        priority: "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not delete the incident",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { removeFireIncident, isPending };
};

export default useRemoveFireIncident;
