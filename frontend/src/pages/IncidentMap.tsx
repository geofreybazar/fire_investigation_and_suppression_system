import { Map } from "lucide-react";
import ComingSoon from "@/components/common/ComingSoon";

const IncidentMap = () => (
  <ComingSoon
    icon={<Map />}
    title='Incident Map'
    description='Approved fire incidents on a map.'
    planned={[
      "Incidents with coordinates shown as markers, coloured by status",
      "Filters by date and status",
      "Click a marker to open the incident",
    ]}
  />
);

export default IncidentMap;
