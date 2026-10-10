import { useMutation, useQueryClient } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

const useVoidTimelineEntry = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: voidTimelineEntry, isPending } = useMutation({
    mutationFn: fireIncidentService.voidTimelineEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["fireIncident"] });
      queryClient.invalidateQueries({ queryKey: ["deletedFireIncidents"] });
      queryClient.invalidateQueries({ queryKey: ["investigationCase"] });
      showToast({
        title: "Entry Voided",
        description: "The entry is kept in the history but no longer counts.",
        type: "success",
        priority: "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not void the entry",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { voidTimelineEntry, isPending };
};

export default useVoidTimelineEntry;
