'use client';

import { useRouter } from 'next/navigation';
import InputHomicide from '@/lib/components/input-homicide';
import WorkbenchHostShellFrame from '@/lib/components/workbench-host-shell-frame';

export default function HostedWorkbenchEventIntakePage() {
  const router = useRouter();

  return (
    <WorkbenchHostShellFrame
      title="Hosted Workbench / Event Intake"
      description="Integrated intake view mounted through the AtoM host-shell surface."
    >
      <InputHomicide onBack={() => router.push('/workbench')} />
    </WorkbenchHostShellFrame>
  );
}
