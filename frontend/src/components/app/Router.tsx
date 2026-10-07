import { Routes, Route } from "react-router";
import Dashboard from "@/pages/Dashboard";
import IncidentMap from "@/pages/IncidentMap";
import FireIncidents from "@/pages/FireIncidents";
import FireStations from "@/pages/FireStations";
import Monitoring from "@/pages/Monitoring";
import ResponseUnits from "@/pages/ResponseUnits";
import IncidentReports from "@/pages/IncidentReports";
import Investigations from "@/pages/Investigations";
import Evidence from "@/pages/Evidence";
import Statistics from "@/pages/Statistics";
import Personnel from "@/pages/Personnel";
import Offices from "@/pages/Offices";
import Settings from "@/pages/Settings";
import MyProfile from "@/pages/MyProfile";
import Positions from "@/pages/Positions";
import IncidentClassification from "@/pages/IncidentClassification";

const routes = [
  { path: "/", element: <Dashboard /> },
  { path: "/incidentmap", element: <IncidentMap /> },
  { path: "/fireincidents", element: <FireIncidents /> },
  { path: "/firestations", element: <FireStations /> },
  { path: "/monitoring", element: <Monitoring /> },
  { path: "/responseunits", element: <ResponseUnits /> },
  { path: "/investigations", element: <Investigations /> },
  { path: "/evidence", element: <Evidence /> },
  { path: "/incidentreports", element: <IncidentReports /> },
  { path: "/statistics", element: <Statistics /> },
  { path: "/personnel", element: <Personnel /> },
  { path: "/offices", element: <Offices /> },
  { path: "/settings", element: <Settings /> },
  { path: "/profile", element: <MyProfile /> },
  { path: "/positions", element: <Positions /> },
  { path: "/incidentclassifications", element: <IncidentClassification /> },
];

const Router = () => {
  return (
    <Routes>
      {routes.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
    </Routes>
  );
};
export default Router;
