import Link from 'next/link';
import WorkbenchHostShellFrame from '@/lib/components/workbench-host-shell-frame';
import {
  WORKBENCH_HOST_SHELL_ENTRY_POINTS,
  resolveWorkbenchHostedRuntime,
} from '@/lib/workbench/host-shell';

export default function HostedWorkbenchHomePage() {
  const runtime = resolveWorkbenchHostedRuntime(process.env);

  return (
    <WorkbenchHostShellFrame
      title="Hosted Workbench"
      description="Initial integrated workbench surfaces mounted inside the AtoM host shell."
    >
      <div className="row g-3 mb-4">
        {WORKBENCH_HOST_SHELL_ENTRY_POINTS.filter(
          (entryPoint) => entryPoint.id !== 'home',
        ).map((entryPoint) => (
          <div className="col-12 col-lg-6" key={entryPoint.id}>
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h2 className="h5">{entryPoint.label}</h2>
                <p className="text-muted">{entryPoint.summary}</p>
                <Link className="btn btn-primary" href={entryPoint.href}>
                  Open {entryPoint.label}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-secondary-subtle">
        <div className="card-body">
          <h2 className="h6 text-uppercase text-muted">Hosted runtime binding</h2>
          <p className="mb-1">
            <strong>Runtime mode:</strong> {runtime.mode}
          </p>
          <p className="mb-0">
            <strong>Plugin route prefix:</strong> {runtime.routePrefix}
          </p>
        </div>
      </div>
    </WorkbenchHostShellFrame>
  );
}
