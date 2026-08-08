const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

type FlowDefinition = { id: string; label: string; spec: string; grep: string; group: string };
type RunStatus = 'running' | 'passed' | 'failed' | 'cancelled';
type PublicRun = {
  runId: string;
  flowId: string;
  label: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  durationMs: number | null;
  output: string;
};

const definitions: Array<[string, string, string, string]> = [
  ['ALL', 'Run the complete E2E suite', '', ''],
  ['E2E-01', 'Center admin login and logout', 'auth/authentication.spec.ts', 'E2E-01'],
  ['E2E-02', 'Owner login and center switching', 'auth/authentication.spec.ts', 'E2E-02'],
  ['E2E-03', 'Teacher and student login', 'auth/authentication.spec.ts', 'E2E-03'],
  ['E2E-04', 'Authorization and permission matrix', 'auth/authentication.spec.ts', 'E2E-04'],
  ['E2E-05', 'Center management', 'setup/center-management.spec.ts', 'E2E-05'],
  ['E2E-06', 'Teacher management', 'people/teacher-create.spec.ts', 'E2E-06'],
  ['E2E-07', 'Student management', 'people/student-create.spec.ts', 'E2E-07'],
  ['E2E-08', 'Student transfer, freeze and archive', 'people/student-lifecycle.spec.ts', 'E2E-08'],
  ['E2E-09', 'Telegram registration conversion', 'people/telegram-conversion.spec.ts', 'E2E-09'],
  ['E2E-10', 'Subjects and assignments', 'academic/subjects-assignments.spec.ts', 'E2E-10'],
  ['E2E-11', 'Rooms and booking', 'academic/rooms-classes-calendar.spec.ts', 'E2E-11'],
  ['E2E-12', 'Class scheduling and enrollment', 'academic/rooms-classes-calendar.spec.ts', 'E2E-12'],
  ['E2E-13', 'Lesson completion', 'academic/rooms-classes-calendar.spec.ts', 'E2E-13'],
  ['E2E-14', 'Calendar actor scope', 'academic/rooms-classes-calendar.spec.ts', 'E2E-14'],
  ['E2E-15', 'Payments, discounts and debts', 'finance/finance-flows.spec.ts', 'E2E-15'],
  ['E2E-16', 'Teacher payment access', 'finance/finance-flows.spec.ts', 'E2E-16'],
  ['E2E-17', 'Finance reporting', 'finance/finance-flows.spec.ts', 'E2E-17'],
  ['E2E-18', 'Online test lifecycle', 'tests/online-test-lifecycle.spec.ts', 'E2E-18'],
  ['E2E-19', 'Teacher portal', 'portals/portal-flows.spec.ts', 'E2E-19'],
  ['E2E-20', 'Student portal', 'portals/portal-flows.spec.ts', 'E2E-20'],
  ['E2E-21', 'Owner reports and retention', 'reports/owner-reports.spec.ts', 'E2E-21'],
  ['E2E-22', 'Supporting administration modules', 'supporting/supporting-modules.spec.ts', 'E2E-22'],
  ['E2E-23', 'Search, filters and pagination', 'supporting/supporting-modules.spec.ts', 'E2E-23'],
  ['E2E-24', 'Service failure and recovery', 'reliability/service-recovery.spec.ts', 'E2E-24'],
  ['CHAIN-A', 'Center to completed lesson', 'chains/business-chains.spec.ts', 'Chain A'],
  ['CHAIN-B', 'Student onboarding to paid tuition', 'chains/business-chains.spec.ts', 'Chain B'],
  ['CHAIN-C', 'Student lifecycle across classes', 'chains/business-chains.spec.ts', 'Chain C'],
  ['CHAIN-D', 'Online test lifecycle chain', 'chains/business-chains.spec.ts', 'Chain D'],
  ['CHAIN-E', 'Room and schedule conflict chain', 'chains/business-chains.spec.ts', 'Chain E'],
];

const FLOW_CATALOG: FlowDefinition[] = definitions.map(([id, label, spec, grep]) => ({
  id,
  label,
  spec: `e2e/${spec}`,
  grep,
  group: id === 'ALL' ? 'Complete suite' : id.startsWith('CHAIN-') ? 'Cross-feature chains' : 'Numbered flows',
}));
const FLOW_BY_ID = new Map(FLOW_CATALOG.map((flow) => [flow.id, flow]));
const MAX_OUTPUT = 250_000;
let activeChild: any = null;
let activeRun: PublicRun | null = null;
let activeTimer: ReturnType<typeof setTimeout> | null = null;
const recentRuns: PublicRun[] = [];

const getE2eDatabase = () => process.env.E2E_DB_NAME || 'crm_frontend_e2e_test';

const assertSafeDatabase = () => {
  const database = getE2eDatabase();
  if (!/^crm_[a-z0-9_]*e2e_test$/i.test(database)) {
    const error: any = new Error('E2E_DB_NAME must identify a dedicated database ending in e2e_test.');
    error.statusCode = 503;
    throw error;
  }
  return database;
};

const getUiDirectory = () => process.env.E2E_UI_DIR || path.resolve(process.cwd(), '..', 'ui');

const appendOutput = (chunk: unknown) => {
  if (!activeRun) return;
  const next = activeRun.output + String(chunk ?? '');
  activeRun.output = next.length > MAX_OUTPUT ? next.slice(-MAX_OUTPUT) : next;
};

const snapshot = (run: PublicRun | null) => run ? { ...run } : null;

const getCatalog = () => ({
  database: getE2eDatabase(),
  running: Boolean(activeRun?.status === 'running'),
  flows: FLOW_CATALOG.map(({ id, label, group }) => ({ id, label, group })),
});

const getStatus = () => ({ active: snapshot(activeRun), recent: recentRuns.map(snapshot) });

const startRun = (flowId: string) => {
  const database = assertSafeDatabase();
  const normalizedId = String(flowId || '').trim().toUpperCase();
  const flow = FLOW_BY_ID.get(normalizedId);
  if (!flow) {
    const error: any = new Error('Unknown E2E flow ID.');
    error.statusCode = 400;
    throw error;
  }
  if (activeRun?.status === 'running' || activeChild) {
    const error: any = new Error('Another E2E run is already active.');
    error.statusCode = 409;
    throw error;
  }

  const uiDirectory = getUiDirectory();
  const cliPath = path.join(uiDirectory, 'node_modules', '@playwright', 'test', 'cli.js');
  if (!fs.existsSync(cliPath)) {
    const error: any = new Error('Playwright is not installed in the UI directory.');
    error.statusCode = 503;
    throw error;
  }

  const runId = crypto.randomUUID();
  activeRun = {
    runId,
    flowId: flow.id,
    label: flow.label,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    durationMs: null,
    output: `[runner] Starting ${flow.id}: ${flow.label}\n`,
  };

  const args = [cliPath, 'test'];
  if (flow.spec) args.push(flow.spec);
  if (flow.grep) args.push('--grep', flow.grep);
  args.push('--project=chromium', '--reporter=line');
  const child = spawn(process.execPath, args, {
    cwd: uiDirectory,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CI: '1',
      E2E_DB_NAME: database,
    },
  });
  activeChild = child;
  child.stdout?.on('data', appendOutput);
  child.stderr?.on('data', appendOutput);
  child.on('error', (error: Error) => appendOutput(`\n[runner] ${error.message}\n`));
  child.on('close', (code: number | null, signal: string | null) => {
    if (!activeRun || activeRun.runId !== runId) return;
    const finishedAt = new Date();
    activeRun.finishedAt = finishedAt.toISOString();
    activeRun.durationMs = finishedAt.getTime() - new Date(activeRun.startedAt).getTime();
    activeRun.exitCode = code;
    activeRun.status = signal ? 'cancelled' : code === 0 ? 'passed' : 'failed';
    appendOutput(`\n[runner] Finished with ${signal ? `signal ${signal}` : `exit code ${code}`}\n`);
    recentRuns.unshift({ ...activeRun });
    recentRuns.splice(10);
    activeChild = null;
    if (activeTimer) clearTimeout(activeTimer);
    activeTimer = null;
  });
  const timeoutMs = Math.max(60_000, Number(process.env.E2E_RUN_TIMEOUT_MS) || 30 * 60_000);
  activeTimer = setTimeout(() => {
    if (activeChild === child && activeRun?.runId === runId) {
      appendOutput(`\n[runner] Timeout after ${timeoutMs}ms; terminating run.\n`);
      child.kill('SIGTERM');
    }
  }, timeoutMs);
  activeTimer.unref?.();

  return snapshot(activeRun);
};

const cancelRun = (runId: string) => {
  if (!activeRun || activeRun.runId !== String(runId) || activeRun.status !== 'running' || !activeChild) {
    const error: any = new Error('Active E2E run not found.');
    error.statusCode = 404;
    throw error;
  }
  activeChild.kill('SIGTERM');
  return snapshot(activeRun);
};

const resetForTests = () => {
  activeChild = null;
  activeRun = null;
  if (activeTimer) clearTimeout(activeTimer);
  activeTimer = null;
  recentRuns.splice(0);
};

module.exports = { getCatalog, getStatus, startRun, cancelRun, assertSafeDatabase, FLOW_CATALOG, resetForTests };

export {};
