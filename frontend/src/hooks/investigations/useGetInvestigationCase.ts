import { useSuspenseQuery } from "@tanstack/react-query";
import investigationService from "@/service/investigation.service";

const useGetInvestigationCase = (incidentId: string) => {
  const { data: investigationCase, isFetching } = useSuspenseQuery({
    queryKey: ["investigationCase", incidentId],
    queryFn: () => investigationService.getInvestigationCase(incidentId),
  });

  return { investigationCase, isFetching };
};

export default useGetInvestigationCase;
