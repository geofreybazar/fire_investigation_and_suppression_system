import { Building2 } from "lucide-react";
import ComingSoon from "@/components/common/ComingSoon";

// Not scoped yet (REQUIREMENTS.md Q-01); hidden from the sidebar.
const FireStations = () => (
  <ComingSoon
    icon={<Building2 />}
    title='Fire Stations'
    description='This section has not been defined yet.'
  />
);

export default FireStations;
