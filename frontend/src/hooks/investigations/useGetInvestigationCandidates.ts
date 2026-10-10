import { useQuery } from "@tanstack/react-query";
import investigationService from "@/service/investigation.service";

const useGetInvestigationCandidates = (incidentId: string, enabled: boolean) => {
  const { data: candidates, isLoading } = useQuery({
    queryKey: ["investigationCandidates", incidentId],
    queryFn: () => investigationService.getInvestigationCandidates(incidentId),
    enabled,
  });

  return { candidates: candidates ?? [], isLoading };
};

export default useGetInvestigationCandidates;
