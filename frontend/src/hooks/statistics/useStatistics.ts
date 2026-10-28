import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import statisticsService from "@/service/statistics.service";
import type { StatisticsFilters } from "@/interface/statistics/statistics";
import { showToast } from "@/utils/resubaleToast";
import { apiErrorMessage } from "@/utils/apiErrorMessage";

export const useGetStatisticsSummary = (filters: StatisticsFilters) => {
  const { data: summary, isFetching } = useSuspenseQuery({
    queryKey: ["statisticsSummary", filters],
    queryFn: () => statisticsService.getSummary(filters),
  });

  return { summary, isFetching };
};

export const useGetIncidentReport = (
  filters: StatisticsFilters,
  page: number,
) => {
  const { data: report, isFetching } = useSuspenseQuery({
    queryKey: ["incidentReport", filters, page],
    queryFn: () => statisticsService.getIncidentReport(filters, page),
  });

  return { report, isFetching };
};

export const useGetMapPoints = (filters: StatisticsFilters) => {
  const { data: points, isFetching } = useSuspenseQuery({
    queryKey: ["incidentMapPoints", filters],
    queryFn: () => statisticsService.getMapPoints(filters),
  });

  return { points, isFetching };
};

export const useDownloadIncidentReport = () => {
  const { mutateAsync: download, isPending } = useMutation({
    mutationFn: statisticsService.downloadIncidentReport,
    onSuccess: ({ truncated }) => {
      showToast({
        title: "Report downloaded",
        description: truncated
          ? "The report was cut off at 10,000 incidents. Narrow the filters to export the rest."
          : "The incident report was saved as a CSV file.",
        type: truncated ? "warning" : "success",
        priority: truncated ? "high" : "low",
      });
    },
    onError: (error) => {
      showToast({
        title: "Could not download the report",
        description: apiErrorMessage(error),
        type: "error",
        priority: "high",
      });
    },
  });

  return { download, isPending };
};
