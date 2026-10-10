import { useMutation, useQueryClient } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

const useUpdateFireIncident = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: updateFireIncident, isPending } = useMutation({
    mutationFn: fireIncidentService.updateFireIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["fireIncident"] });
      queryClient.invalidateQueries({ queryKey: ["deletedFireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["investigationCase"] });
      showToast({
        title: "Incident Updated",
        description: "The incident details have been saved.",
        type: "success",
        priority: "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not update the incident",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { updateFireIncident, isPending };
};

export default useUpdateFireIncident;
