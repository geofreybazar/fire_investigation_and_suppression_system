import { Hourglass } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";

interface ComingSoonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  // What the page will contain once it is built.
  planned?: string[];
}

// Placeholder for sections that are planned but not built yet, so they read as
// "coming" rather than broken.
const ComingSoon = ({ icon, title, description, planned }: ComingSoonProps) => {
  return (
    <div className='space-y-6'>
      <PageHeader icon={icon} title={title} description={description} />
      <EmptyState
        icon={<Hourglass />}
        title='Coming soon'
        description='This section is planned but not available yet.'
      >
        {planned && planned.length > 0 && (
          <ul className='mt-4 space-y-1 text-left text-sm text-muted-foreground'>
            {planned.map((item) => (
              <li key={item} className='flex gap-2'>
                <span aria-hidden className='text-primary'>
                  •
                </span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </EmptyState>
    </div>
  );
};

export default ComingSoon;
