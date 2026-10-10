import { useMutation, useQueryClient } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

const useResubmitFireIncident = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: resubmitFireIncident, isPending } = useMutation({
    mutationFn: fireIncidentService.resubmitFireIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["fireIncident"] });
      queryClient.invalidateQueries({ queryKey: ["deletedFireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["investigationCase"] });
      showToast({
        title: "Incident Resubmitted",
        description: "The incident is waiting for approval again.",
        type: "success",
        priority: "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not resubmit the incident",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { resubmitFireIncident, isPending };
};

export default useResubmitFireIncident;
