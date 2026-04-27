import { readFileSync } from 'fs';
import path from 'path';

describe('atom host stack contract', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const envContractPath = path.join(
    repoRoot,
    'infrastructure',
    'atom-stack',
    '.env.example',
  );
  const composePath = path.join(
    repoRoot,
    'infrastructure',
    'atom-stack',
    'docker-compose.yml',
  );

  it('declares required host stack environment defaults', () => {
    const envContract = readFileSync(envContractPath, 'utf8');

    expect(envContract).toContain('ATOM_HOST_PORT=62080');
    expect(envContract).toContain('ATOM_HOST_HEALTH_PATH=/healthz');
    expect(envContract).toContain('ATOM_STACK_WAIT_TIMEOUT=240');
    expect(envContract).toContain('WORKBENCH_PLUGIN_API_BASE_URL=');
    expect(envContract).toContain('/plugins/homicide-tracker/api');
  });

  it('defines deterministic topology and health checks', () => {
    const compose = readFileSync(composePath, 'utf8');

    expect(compose).toContain('atom-db:');
    expect(compose).toContain('atom-cache:');
    expect(compose).toContain('atom-host:');
    expect(compose).toContain('depends_on:');
    expect(compose).toContain('healthcheck:');
    expect(compose).toContain('ATOM_HOST_INTERNAL_PORT');
    expect(compose).toContain('ATOM_HOST_HEALTH_PATH');
  });
});
