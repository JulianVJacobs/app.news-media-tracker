import Link from 'next/link';
import { WORKBENCH_HOST_SHELL_ENTRY_POINTS } from '../workbench/host-shell';

type WorkbenchHostShellFrameProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

const WorkbenchHostShellFrame = ({
  title,
  description,
  children,
}: WorkbenchHostShellFrameProps) => (
  <div className="container py-4">
    <div className="border rounded-3 p-3 mb-4 bg-light">
      <p className="text-uppercase text-muted small mb-2">
        AtoM Host Shell / Workbench
      </p>
      <h1 className="h3 mb-2">{title}</h1>
      <p className="text-muted mb-3">{description}</p>
      <nav aria-label="Workbench host navigation">
        <ul className="nav nav-pills gap-2">
          {WORKBENCH_HOST_SHELL_ENTRY_POINTS.map((entryPoint) => (
            <li className="nav-item" key={entryPoint.id}>
              <Link className="nav-link" href={entryPoint.href}>
                {entryPoint.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
    {children}
  </div>
);

export default WorkbenchHostShellFrame;
