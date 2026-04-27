import fs from 'fs';
import os from 'os';
import path from 'path';

const {
  executeBootstrap,
  resetBootstrapState,
} = require('../scripts/atom-bootstrap-lib.cjs');

const noOpLogger = {
  log: () => {},
};

describe('atom bootstrap orchestration', () => {
  const tempDirs = new Set<string>();

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    tempDirs.clear();
  });

  it('executes all steps once and skips them on rerun using persisted state', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atom-bootstrap-'));
    tempDirs.add(tmpDir);
    const stateFile = path.join(tmpDir, 'bootstrap-state.json');
    const executedCommands = [];

    const runner = (command) => {
      executedCommands.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    const steps = [
      { id: 'admin', description: 'admin setup', command: 'echo admin' },
      { id: 'plugin', description: 'plugin enablement', command: 'echo plugin' },
    ];

    const firstRun = executeBootstrap({ steps, stateFile, runner, logger: noOpLogger });
    const secondRun = executeBootstrap({ steps, stateFile, runner, logger: noOpLogger });

    expect(firstRun.executed).toBe(2);
    expect(firstRun.skipped).toBe(0);
    expect(secondRun.executed).toBe(0);
    expect(secondRun.skipped).toBe(2);
    expect(executedCommands).toEqual(['echo admin', 'echo plugin']);
  });

  it('tolerates known idempotent errors and records the step as complete', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atom-bootstrap-'));
    tempDirs.add(tmpDir);
    const stateFile = path.join(tmpDir, 'bootstrap-state.json');

    const firstRun = executeBootstrap({
      steps: [{ id: 'admin', description: 'admin setup', command: 'echo admin' }],
      stateFile,
      logger: noOpLogger,
      runner: () => ({
        status: 1,
        stdout: '',
        stderr: 'admin user already exists',
      }),
    });

    const secondRun = executeBootstrap({
      steps: [{ id: 'admin', description: 'admin setup', command: 'echo admin' }],
      stateFile,
      logger: noOpLogger,
      runner: () => ({
        status: 0,
        stdout: '',
        stderr: '',
      }),
    });

    expect(firstRun.executed).toBe(1);
    expect(firstRun.toleratedFailures).toBe(1);
    expect(secondRun.skipped).toBe(1);
  });

  it('allows reset plus reseed by clearing persisted state', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atom-bootstrap-'));
    tempDirs.add(tmpDir);
    const stateFile = path.join(tmpDir, 'bootstrap-state.json');
    const executedCommands = [];

    const runner = (command) => {
      executedCommands.push(command);
      return { status: 0, stdout: '', stderr: '' };
    };

    const steps = [{ id: 'baseline', description: 'baseline', command: 'echo baseline' }];

    executeBootstrap({ steps, stateFile, runner, logger: noOpLogger });
    resetBootstrapState(stateFile);
    executeBootstrap({ steps, stateFile, runner, logger: noOpLogger });

    expect(executedCommands).toEqual(['echo baseline', 'echo baseline']);
  });
});
