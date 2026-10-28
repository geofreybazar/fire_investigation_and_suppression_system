import { FileText } from "lucide-react";
import ComingSoon from "@/components/common/ComingSoon";

const IncidentReports = () => (
  <ComingSoon
    icon={<FileText />}
    title='Incident Reports'
    description='Tabular reports of approved fire incidents.'
    planned={["Filter by date, office, status and category", "Download as CSV"]}
  />
);

export default IncidentReports;
