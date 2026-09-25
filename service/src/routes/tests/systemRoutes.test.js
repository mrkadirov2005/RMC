require('reflect-metadata');

jest.mock('../../modules/system', () => ({
  getStats: jest.fn(),
  getDatabaseTables: jest.fn(),
  getDatabaseTableRows: jest.fn(),
  createDatabaseTableRow: jest.fn(),
  updateDatabaseTableRow: jest.fn(),
  deleteDatabaseTableRow: jest.fn(),
  redeployServer: jest.fn(),
  triggerBackup: jest.fn(),
  getBackupStats: jest.fn(),
  resetStudents: jest.fn(),
  resetTeachers: jest.fn(),
  resetClasses: jest.fn(),
  resetPayments: jest.fn(),
}));

const { requireAuth, requireOwner } = require('../../middleware/auth');
const systemRoutes = require('../systemRoutes');

// RMC-052: the system router ("studio" surface with arbitrary table read/write) must never expose
// a route with no auth guard at all. A baseline `router.use(requireAuth)` now sits above every
// route, plus the pre-existing per-route requireOwner/requireRole checks. This test introspects
// the router's actual registered stack (not a hand-maintained list) so a future route added
// without any guard fails automatically instead of silently shipping unauthenticated.
describe('system router auth-guard inventory (RMC-052)', () => {
  const stack = systemRoutes.stack;

  const isRequireAuthLayer = (layer) => !layer.route && layer.handle === requireAuth;

  // requireRole returns a fresh closure per call, so identity comparison against a specific
  // requireRole('x') instance won't work for per-route requireRole layers; instead we recognize
  // requireRole-produced middleware by name, since requireRole always returns an anonymous
  // function assigned from the same factory (Function.prototype.name for return (req,res,next)=>{}
  // is empty, so we fall back to marking any function whose source references requireRole's
  // closure variables via toString() containing the tell-tale role-check literal).
  const looksLikeRequireRoleMiddleware = (fn) =>
    typeof fn === 'function' && /Access denied\. You do not have permission/.test(fn.toString());

  it('has at least one route registered (sanity check that the router is not empty)', () => {
    const routeLayers = stack.filter((layer) => !!layer.route);
    expect(routeLayers.length).toBeGreaterThan(0);
  });

  it('mounts a baseline requireAuth middleware before any route layer', () => {
    const baselineIndex = stack.findIndex(isRequireAuthLayer);
    expect(baselineIndex).toBeGreaterThanOrEqual(0);

    const firstRouteIndex = stack.findIndex((layer) => !!layer.route);
    expect(firstRouteIndex).toBeGreaterThan(baselineIndex);
  });

  it('gives every registered route at least one auth-guard middleware, either its own or the baseline', () => {
    const baselineIndex = stack.findIndex(isRequireAuthLayer);

    stack.forEach((layer, index) => {
      if (!layer.route) return; // not a leaf route (e.g. the baseline router.use layer itself)

      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      const path = layer.route.path;

      // Covered by the baseline requireAuth mounted earlier in the stack.
      const coveredByBaseline = baselineIndex >= 0 && index > baselineIndex;

      // Or the route itself declares an auth-related guard in its own handler chain.
      const routeStack = layer.route.stack || [];
      const ownGuard = routeStack.some((routeLayer) => {
        const fn = routeLayer.handle;
        return fn === requireAuth || fn === requireOwner || looksLikeRequireRoleMiddleware(fn);
      });

      expect(coveredByBaseline || ownGuard).toBe(true);
      if (!(coveredByBaseline || ownGuard)) {
        throw new Error(`Route ${methods} ${path} has no auth guard (own or baseline).`);
      }
    });
  });

  it('still keeps the owner-only database "studio" routes behind requireOwner specifically', () => {
    const ownerOnlyPaths = ['/database/tables', '/redeploy', '/dev/reset-students'];
    ownerOnlyPaths.forEach((expectedPath) => {
      const layer = stack.find((l) => l.route && l.route.path === expectedPath);
      expect(layer).toBeDefined();
      const routeStack = layer.route.stack || [];
      expect(routeStack.some((routeLayer) => routeLayer.handle === requireOwner)).toBe(true);
    });
  });
});
