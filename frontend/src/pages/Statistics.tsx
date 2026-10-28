import { BarChart3 } from "lucide-react";
import ComingSoon from "@/components/common/ComingSoon";

const Statistics = () => (
  <ComingSoon
    icon={<BarChart3 />}
    title='Statistics & Analytics'
    description='Fire incident statistics for your office and the offices below it.'
    planned={[
      "Incidents by status, category, alarm level, month and office",
      "Casualties, families affected and estimated damages",
      "Causes and classifications from completed investigations",
    ]}
  />
);

export default Statistics;
