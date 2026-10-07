import { useUserStore } from "@/store/userStore";
import { Navigate } from "react-router";

import { ThemeProvider } from "@/components/app/providers/ThemeProvider";
import Layout from "@/components/layout/Layout";
import Router from "@/components/app/Router";

const HomePage = () => {
  const user = useUserStore((state) => state.user);
  if (!user) {
    return <Navigate to='/login' replace />;
  }

  return (
    <ThemeProvider defaultTheme='dark' storageKey='vite-ui-theme'>
      <Layout>
        <Router />
      </Layout>
    </ThemeProvider>
  );
};

export default HomePage;
