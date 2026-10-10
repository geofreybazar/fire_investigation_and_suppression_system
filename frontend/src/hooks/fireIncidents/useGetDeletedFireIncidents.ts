import { useSuspenseQuery } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";

const useGetDeletedFireIncidents = (page: number) => {
  const { data: deletedFireIncidents, isFetching } = useSuspenseQuery({
    queryKey: ["deletedFireIncidents", page],
    queryFn: () => fireIncidentService.getDeletedFireIncidents(page),
  });

  return { deletedFireIncidents, isFetching };
};

export default useGetDeletedFireIncidents;
