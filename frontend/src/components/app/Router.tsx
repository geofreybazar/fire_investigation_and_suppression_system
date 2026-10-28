import { Routes, Route } from "react-router";
import loadable from "@loadable/component";
import Dashboard from "@/pages/Dashboard";
import IncidentMap from "@/pages/IncidentMap";
import FireStations from "@/pages/FireStations";
import Monitoring from "@/pages/Monitoring";
import ResponseUnits from "@/pages/ResponseUnits";
import IncidentReports from "@/pages/IncidentReports";
import Evidence from "@/pages/Evidence";
import Statistics from "@/pages/Statistics";
import Personnel from "@/pages/Personnel";
import Offices from "@/pages/Offices";
import Settings from "@/pages/Settings";
import MyProfile from "@/pages/MyProfile";
import Positions from "@/pages/Positions";
import IncidentClassification from "@/pages/IncidentClassification";
import { useUserStore } from "@/store/userStore";
import {
  ADMINISTRATION_LINKS,
  FIRE_OPERATIONS_LINKS,
  INVESTIGATION_LINKS,
  OVERVIEW_LINKS,
  REPORTS_LINKS,
} from "@/constants/links";
import { canViewIncidents } from "@/utils/incidentPermissions";

// The incident and investigation pages are split out of the main bundle.
const FireIncidents = loadable(() => import("@/pages/FireIncidents"));
const FireIncidentDetail = loadable(() => import("@/pages/FireIncidentDetail"));
const Investigations = loadable(() => import("@/pages/Investigations"));
const InvestigationDetail = loadable(() => import("@/pages/InvestigationDetail"));
const AuditLog = loadable(() => import("@/pages/AuditLog"));

const routes = [
  { path: "/", element: <Dashboard /> },
  { path: "/incidentmap", element: <IncidentMap /> },
  { path: "/fireincidents", element: <FireIncidents /> },
  { path: "/fireincidents/:id", element: <FireIncidentDetail /> },
  { path: "/firestations", element: <FireStations /> },
  { path: "/monitoring", element: <Monitoring /> },
  { path: "/responseunits", element: <ResponseUnits /> },
  { path: "/investigations", element: <Investigations /> },
  { path: "/investigations/:id", element: <InvestigationDetail /> },
  { path: "/evidence", element: <Evidence /> },
  { path: "/incidentreports", element: <IncidentReports /> },
  { path: "/statistics", element: <Statistics /> },
  { path: "/personnel", element: <Personnel /> },
  { path: "/offices", element: <Offices /> },
  { path: "/settings", element: <Settings /> },
  { path: "/profile", element: <MyProfile /> },
  { path: "/positions", element: <Positions /> },
  { path: "/incidentclassifications", element: <IncidentClassification /> },
  { path: "/auditlog", element: <AuditLog /> },
];

// Each page uses its sidebar link's rule; detail pages follow their list.
const linkAccess = new Map(
  [
    ...OVERVIEW_LINKS,
    ...FIRE_OPERATIONS_LINKS,
    ...INVESTIGATION_LINKS,
    ...REPORTS_LINKS,
    ...ADMINISTRATION_LINKS,
  ].map((link) => [link.link, link.canAccess]),
);
linkAccess.set("/fireincidents/:id", canViewIncidents);
linkAccess.set("/investigations/:id", canViewIncidents);

// Display only: the backend rejects every request the role can't make.
const RequireAccess = ({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) => {
  const user = useUserStore((state) => state.user);
  const canAccess = linkAccess.get(path);

  if (canAccess && !canAccess(user)) {
    return (
      <div className='rounded-lg border p-10 text-center text-sm text-muted-foreground'>
        This page is not available for your role.
      </div>
    );
  }

  return children;
};

const Router = () => {
  return (
    <Routes>
      {routes.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={<RequireAccess path={path}>{element}</RequireAccess>}
        />
      ))}
    </Routes>
  );
};
export default Router;
