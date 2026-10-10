import { useSuspenseQuery } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";
import type { FireIncidentListFilters } from "@/interface/fireIncident/fireIncident";

const useGetFireIncidents = (filters: FireIncidentListFilters) => {
  const { data: fireIncidents, isFetching } = useSuspenseQuery({
    queryKey: ["fireIncidents", filters],
    queryFn: () => fireIncidentService.getFireIncidents(filters),
  });

  return { fireIncidents, isFetching };
};

export default useGetFireIncidents;
