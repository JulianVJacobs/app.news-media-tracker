'use client';

import { useRouter } from 'next/navigation';
import ListHomicides from '@/lib/components/list-homicides';
import WorkbenchHostShellFrame from '@/lib/components/workbench-host-shell-frame';

export default function HostedWorkbenchEventListPage() {
  const router = useRouter();

  return (
    <WorkbenchHostShellFrame
      title="Hosted Workbench / Event List"
      description="Integrated list view mounted through the AtoM host-shell surface."
    >
      <ListHomicides onBack={() => router.push('/workbench')} />
    </WorkbenchHostShellFrame>
  );
}
