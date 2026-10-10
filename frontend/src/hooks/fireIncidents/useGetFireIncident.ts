import { useSuspenseQuery } from "@tanstack/react-query";
import fireIncidentService from "@/service/fireIncident.service";

const useGetFireIncident = (id: string) => {
  const { data: fireIncident, isFetching } = useSuspenseQuery({
    queryKey: ["fireIncident", id],
    queryFn: () => fireIncidentService.getFireIncident(id),
  });

  return { fireIncident, isFetching };
};

export default useGetFireIncident;
