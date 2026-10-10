import { useMutation, useQueryClient } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

const useAddTimelineEntry = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: addTimelineEntry, isPending } = useMutation({
    mutationFn: fireIncidentService.addTimelineEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["fireIncident"] });
      queryClient.invalidateQueries({ queryKey: ["deletedFireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["investigationCase"] });
      showToast({
        title: "Timeline Updated",
        description: "The status update has been recorded.",
        type: "success",
        priority: "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not record the update",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { addTimelineEntry, isPending };
};

export default useAddTimelineEntry;
