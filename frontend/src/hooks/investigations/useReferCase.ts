import { useMutation, useQueryClient } from "@tanstack/react-query";
import investigationService from "@/service/investigation.service";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

const useReferCase = () => {
  const queryClient = useQueryClient();

  const { mutateAsync: referCase, isPending } = useMutation({
    mutationFn: investigationService.referCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investigationCase"] });
      queryClient.invalidateQueries({ queryKey: ["investigation"] });
      queryClient.invalidateQueries({ queryKey: ["investigationQueue"] });
      queryClient.invalidateQueries({ queryKey: ["assignedInvestigations"] });
      queryClient.invalidateQueries({ queryKey: ["fireIncident"] });
      showToast({
        title: "Case Referred",
        description: "The case has been moved to the selected office.",
        type: "success",
        priority: "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not refer the case",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { referCase, isPending };
};

export default useReferCase;
