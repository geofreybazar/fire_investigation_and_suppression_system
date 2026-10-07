import loadable from "@loadable/component";
import { ErrorBoundary } from "react-error-boundary";

import Apperance from "@/components/features/settings/Apperance";
import NotificationLoading from "@/components/features/settings/notificationSettings/NotificationLoading";
import Security from "@/components/features/settings/security/Security";
import NotificationSettingsError from "@/components/features/settings/notificationSettings/NotificationSettingsError";

const Notifications = loadable(
  () =>
    import("@/components/features/settings/notificationSettings/Notifications"),
  {
    fallback: <NotificationLoading />,
  },
);

const Settings = () => {
  return (
    <div className='mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6'>
      {/* Header */}
      <div>
        <h1 className='text-xl font-semibold sm:text-2xl'>Settings</h1>

        <p className='text-sm text-muted-foreground'>
          Manage your FIIS preferences and account settings.
        </p>
      </div>

      {/* Appearance */}
      <Apperance />

      {/* Notification */}
      <ErrorBoundary FallbackComponent={NotificationSettingsError}>
        <Notifications />
      </ErrorBoundary>

      {/* Security */}
      <Security />
    </div>
  );
};

export default Settings;
