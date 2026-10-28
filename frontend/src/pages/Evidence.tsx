import { Shield } from "lucide-react";
import ComingSoon from "@/components/common/ComingSoon";

const Evidence = () => (
  <ComingSoon
    icon={<Shield />}
    title='Evidence'
    description='Photos and documents attached to incidents and investigations.'
    planned={[
      "Upload images and PDFs to an incident or investigation",
      "Access limited to the offices that can see the incident",
      "Every download recorded in the audit log",
    ]}
  />
);

export default Evidence;
