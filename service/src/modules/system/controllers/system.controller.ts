const systemService = require('../services/system.service');
const e2eRunnerService = require('../services/e2e-runner.service');

const redeployServer = async (req: any, res: any) => {
  try {
    systemService.validateRedeployPassword(req.body?.password);
    systemService.scheduleRedeploy();
    res.status(202).json({
      message: 'Server redeploy started.',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

const resetTable = (tableName: 'students' | 'teachers' | 'classes' | 'payments') => async (req: any, res: any) => {
  try {
    systemService.validateDevResetRequest(req.body?.confirmation);
    const result = await systemService.resetTable(tableName);
    res.json({
      message: `${tableName} reset completed.`,
      ...result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

const getStats = async (req: any, res: any) => {
  try {
    const stats = await systemService.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load server stats.' });
  }
};

const getDatabaseTables = async (_req: any, res: any) => {
  try { res.json(await systemService.getDatabaseTables()); }
  catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load database tables.' }); }
};

const getDatabaseTableRows = async (req: any, res: any) => {
  try {
    res.json(await systemService.getDatabaseTableRows(String(req.params.table || ''), {
      limit: Number(req.query.limit), offset: Number(req.query.offset), query: String(req.query.q || ''),
    }));
  } catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load table rows.' }); }
};

const getE2eCatalog = (_req: any, res: any) => {
  try { res.json(e2eRunnerService.getCatalog()); }
  catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message }); }
};

const getE2eStatus = (_req: any, res: any) => {
  try { res.json(e2eRunnerService.getStatus()); }
  catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message }); }
};

const startE2eRun = (req: any, res: any) => {
  try { res.status(202).json(e2eRunnerService.startRun(req.body?.flowId)); }
  catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message }); }
};

const cancelE2eRun = (req: any, res: any) => {
  try { res.json(e2eRunnerService.cancelRun(req.params.runId)); }
  catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message }); }
};

const getE2eViewer = (_req: any, res: any) => {
  const frameAncestors = process.env.E2E_VIEWER_FRAME_ANCESTORS || "'self' https://*.vercel.app";
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self' ws: wss:; img-src 'self' data:; frame-ancestors ${frameAncestors}`);
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body,#screen{width:100%;height:100%;margin:0;overflow:hidden;background:#0f172a}#status{position:fixed;z-index:2;left:12px;top:12px;padding:6px 10px;border-radius:6px;background:#020617cc;color:#e2e8f0;font:12px system-ui}</style></head>
<body><div id="status">Connecting to live browser…</div><div id="screen"></div>
<script type="module">
import RFB from './novnc/core/rfb.js';
const status = document.getElementById('status');
const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
history.replaceState(null, '', location.pathname);
if (!token) { status.textContent = 'Viewer token is missing.'; throw new Error('missing viewer token'); }
const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const socketUrl = protocol + '//' + location.host + '/api/system/dev/e2e/viewer/ws?token=' + encodeURIComponent(token);
const rfb = new RFB(document.getElementById('screen'), socketUrl, { shared: true });
rfb.viewOnly = true; rfb.scaleViewport = true; rfb.resizeSession = false;
rfb.addEventListener('connect', () => { status.textContent = 'Live'; setTimeout(() => status.remove(), 1200); });
rfb.addEventListener('disconnect', (event) => { status.textContent = event.detail.clean ? 'Flow finished.' : 'Viewer disconnected.'; });
rfb.addEventListener('securityfailure', () => { status.textContent = 'Viewer authorization failed.'; });
</script></body></html>`);
};

module.exports = {
  getStats,
  getDatabaseTables,
  getDatabaseTableRows,
  getE2eCatalog,
  getE2eStatus,
  startE2eRun,
  cancelE2eRun,
  getE2eViewer,
  redeployServer,
  resetStudents: resetTable('students'),
  resetTeachers: resetTable('teachers'),
  resetClasses: resetTable('classes'),
  resetPayments: resetTable('payments'),
};

export {};
