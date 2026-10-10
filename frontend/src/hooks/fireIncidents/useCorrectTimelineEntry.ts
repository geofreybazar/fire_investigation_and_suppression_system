import { useMutation, useQueryClient } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

const useCorrectTimelineEntry = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: correctTimelineEntry, isPending } = useMutation({
    mutationFn: fireIncidentService.correctTimelineEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["fireIncident"] });
      queryClient.invalidateQueries({ queryKey: ["deletedFireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["investigationCase"] });
      showToast({
        title: "Entry Corrected",
        description: "The original entry is kept and marked as corrected.",
        type: "success",
        priority: "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not correct the entry",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { correctTimelineEntry, isPending };
};

export default useCorrectTimelineEntry;
