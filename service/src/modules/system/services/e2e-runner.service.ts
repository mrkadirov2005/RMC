const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

type FlowDefinition = { id: string; label: string; grep: string; group: string };
type RunStatus = 'running' | 'passed' | 'failed' | 'cancelled' | 'skipped';
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
  viewerUrl?: string;
  viewerToken?: string;
};

const workflowDefinitions = require('../../../../config/e2e-workflows.json') as Array<{
  id: string;
  label: string;
  group: string;
}>;
const FLOW_CATALOG: FlowDefinition[] = [
  { id: 'ALL', label: 'Run the complete E2E suite', grep: '', group: 'Complete suite' },
  ...workflowDefinitions.map(({ id, label, group }) => ({
    id,
    label,
    group,
    grep: `\\b${id}\\b`,
  })),
];
const FLOW_BY_ID = new Map(FLOW_CATALOG.map((flow) => [flow.id, flow]));
const MAX_OUTPUT = 250_000;
let activeChild: any = null;
let activeRun: PublicRun | null = null;
let activeTimer: ReturnType<typeof setTimeout> | null = null;
const recentRuns: PublicRun[] = [];

const allocateRunPorts = () => {
  // Each run gets its own ports so a stale process from an interrupted run
  // cannot block the next Playwright invocation on the default 4100/5174 pair.
  const backendPort = crypto.randomInt(20_000, 40_000);
  const frontendPort = crypto.randomInt(40_001, 60_000);
  return { backendPort, frontendPort };
};

const terminateProcessTree = (child: any) => {
  if (!child?.pid) return;
  try {
    // Playwright launches Vite and a test backend as descendants. Killing the
    // process group prevents those servers from surviving cancellation/timeouts.
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
    else child.kill('SIGTERM');
  } catch {
    child.kill?.('SIGTERM');
  }
};

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

const getUiDirectory = () => {
  const candidates = [
    process.env.E2E_UI_DIR,
    path.resolve(process.cwd(), 'ui'),
    path.resolve(process.cwd(), '..', 'ui'),
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'ui'),
  ].filter(Boolean).map((candidate) => path.resolve(String(candidate)));
  const uniqueCandidates = [...new Set(candidates)];
  const withPlaywright = uniqueCandidates.find((candidate) =>
    fs.existsSync(path.join(candidate, 'node_modules', '@playwright', 'test', 'cli.js'))
  );
  if (withPlaywright) return withPlaywright;

  const uiProject = uniqueCandidates.find((candidate) =>
    fs.existsSync(path.join(candidate, 'package.json')) && fs.existsSync(path.join(candidate, 'playwright.config.ts'))
  );
  if (uiProject) {
    const error: any = new Error(`Playwright dependencies are missing in ${uiProject}. Run npm install in that directory.`);
    error.statusCode = 503;
    throw error;
  }

  const error: any = new Error(`UI E2E project was not found. Checked: ${uniqueCandidates.join(', ')}`);
  error.statusCode = 503;
  throw error;
};

const appendOutput = (chunk: unknown) => {
  if (!activeRun) return;
  const next = activeRun.output + String(chunk ?? '');
  activeRun.output = next.length > MAX_OUTPUT ? next.slice(-MAX_OUTPUT) : next;
};

const snapshot = (run: PublicRun | null) => run ? { ...run } : null;

const isViewerEnabled = () => process.env.E2E_LIVE_VIEW_ENABLED === 'true';
const isViewerTokenValid = (token: string) => Boolean(
  isViewerEnabled()
  && activeRun?.viewerToken
  && activeRun.viewerToken.length === token.length
  && crypto.timingSafeEqual(Buffer.from(activeRun.viewerToken), Buffer.from(token))
  && activeRun.status === 'running'
);

const getCompletedStatus = (flowId: string, output: string, code: number | null, signal: string | null): RunStatus => {
  if (signal) return 'cancelled';
  if (code !== 0) return 'failed';
  const selectedFlowWasSkipped = flowId !== 'ALL'
    && /\b(?:1|one) skipped\b/i.test(output)
    && !/\b(?:1|one) passed\b/i.test(output);
  return selectedFlowWasSkipped ? 'skipped' : 'passed';
};

const getCatalog = () => ({
  database: getE2eDatabase(),
  viewerEnabled: isViewerEnabled(),
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
  const { backendPort, frontendPort } = allocateRunPorts();

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
    output: `[runner] Starting ${flow.id}: ${flow.label}\n[runner] Ports: backend ${backendPort}, frontend ${frontendPort}\n`,
    ...(isViewerEnabled() ? {
      viewerUrl: '/system/dev/e2e/viewer',
      viewerToken: crypto.randomBytes(32).toString('base64url'),
    } : {}),
  };

  const args = [cliPath, 'test'];
  if (flow.grep) args.push('--grep', flow.grep);
  args.push('--project=chromium', '--reporter=line');
  const child = spawn(process.execPath, args, {
    cwd: uiDirectory,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      CI: '1',
      E2E_DB_NAME: database,
      E2E_BACKEND_PORT: String(backendPort),
      E2E_FRONTEND_PORT: String(frontendPort),
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
    activeRun.status = getCompletedStatus(flow.id, activeRun.output, code, signal);
    appendOutput(`\n[runner] Finished with ${signal ? `signal ${signal}` : `exit code ${code}`}\n`);
    delete activeRun.viewerToken;
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
      terminateProcessTree(child);
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
  terminateProcessTree(activeChild);
  return snapshot(activeRun);
};

const resetForTests = () => {
  activeChild = null;
  activeRun = null;
  if (activeTimer) clearTimeout(activeTimer);
  activeTimer = null;
  recentRuns.splice(0);
};

module.exports = { getCatalog, getStatus, startRun, cancelRun, assertSafeDatabase, FLOW_CATALOG, resetForTests, getCompletedStatus, isViewerTokenValid };

export {};
