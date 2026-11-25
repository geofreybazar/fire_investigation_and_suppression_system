import { Routes, Route } from "react-router";
import loadable from "@loadable/component";
import Dashboard from "@/pages/Dashboard";
import Personnel from "@/pages/Personnel";
import Offices from "@/pages/Offices";
import Settings from "@/pages/Settings";
import MyProfile from "@/pages/MyProfile";
import Positions from "@/pages/Positions";
import { useUserStore } from "@/store/userStore";
import { ALL_LINKS } from "@/constants/links";

const AuditLog = loadable(() => import("@/pages/AuditLog"));

const routes = [
  { path: "/", element: <Dashboard /> },
  { path: "/personnel", element: <Personnel /> },
  { path: "/offices", element: <Offices /> },
  { path: "/settings", element: <Settings /> },
  { path: "/profile", element: <MyProfile /> },
  { path: "/positions", element: <Positions /> },
  { path: "/auditlog", element: <AuditLog /> },
];

// Each page uses its sidebar link's rule; detail pages follow their list.
const linkAccess = new Map(ALL_LINKS.map((link) => [link.link, link.canAccess]));

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
