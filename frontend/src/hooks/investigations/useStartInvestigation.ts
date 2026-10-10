import { useMutation, useQueryClient } from "@tanstack/react-query";
import investigationService from "@/service/investigation.service";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

const useStartInvestigation = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: startInvestigation, isPending } = useMutation({
    mutationFn: investigationService.startInvestigation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investigationCase"] });
      queryClient.invalidateQueries({ queryKey: ["investigation"] });
      queryClient.invalidateQueries({ queryKey: ["investigationQueue"] });
      queryClient.invalidateQueries({ queryKey: ["assignedInvestigations"] });
      queryClient.invalidateQueries({ queryKey: ["fireIncident"] });
      showToast({
        title: "Investigation Started",
        description: "The investigator has been assigned.",
        type: "success",
        priority: "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not start the investigation",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { startInvestigation, isPending };
};

export default useStartInvestigation;
