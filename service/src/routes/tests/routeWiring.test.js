require('reflect-metadata');

jest.mock('../../db/pool', () => ({ db: {}, query: jest.fn(), sql: require('drizzle-orm').sql }));
jest.mock('../../db/mongo', () => ({ getMongoDb: jest.fn(async () => null) }));

const fs = require('fs');
const path = require('path');

const routesDir = path.resolve(__dirname, '..');
const routeFiles = fs.readdirSync(routesDir).filter((file) => file.endsWith('Routes.ts')).sort();

const loadRouter = (file) => require(path.join(routesDir, file));

const describeRoutes = (router) =>
  (router.stack || [])
    .filter((layer) => layer.route)
    .map((layer) => ({
      method: Object.keys(layer.route.methods)[0].toUpperCase(),
      routePath: layer.route.path,
      handlerCount: layer.route.stack.length,
      handlers: layer.route.stack.map((entry) => entry.handle),
    }));

const segmentsOf = (routePath) => String(routePath).split('/').filter(Boolean);

// Routers that are deliberately reachable without `requireAuth` inside the router itself.
// Each is guarded where it is mounted in index.ts, or by its own dedicated middleware.
const guardedElsewhere = {
  telegramStudentRoutes: 'requireTelegramBotSecret on every route',
  consolidatePublicRoutes: 'public share-token endpoints, rate limited at the mount',
  systemRoutes: 'router-level requireAuth applied with router.use',
  portalRoutes: 'mounted behind requireAuth and the student role',
  translationRoutes: 'public reads of static content, writes guarded inside the router',
  testSharePublicRoutes: 'public test share links, rate limited at the mount; eligibility is checked per username',
};

describe('route modules', () => {
  it('covers every router file in the routes directory', () => {
    expect(routeFiles.length).toBeGreaterThan(30);
  });

  it.each(routeFiles)('%s exports a router with at least one route', (file) => {
    const routes = describeRoutes(loadRouter(file));

    expect(routes.length).toBeGreaterThan(0);
  });

  it.each(routeFiles)('%s gives every route at least one handler', (file) => {
    const withoutHandlers = describeRoutes(loadRouter(file))
      .filter((route) => route.handlerCount === 0)
      .map((route) => `${route.method} ${route.routePath}`);

    expect(withoutHandlers).toEqual([]);
  });

  // Express matches in registration order, so a parameterized segment registered first will
  // swallow a literal route registered later at the same position: /:id would capture
  // /class/42 unless /class/:classId comes first.
  it.each(routeFiles)('%s registers literal paths before the parameterized ones that would shadow them', (file) => {
    const routes = describeRoutes(loadRouter(file));
    const shadowed = [];

    routes.forEach((earlier, earlierIndex) => {
      const earlierSegments = segmentsOf(earlier.routePath);
      routes.slice(earlierIndex + 1).forEach((later) => {
        if (later.method !== earlier.method) return;
        const laterSegments = segmentsOf(later.routePath);
        if (laterSegments.length !== earlierSegments.length) return;
        const shadows = earlierSegments.every((segment, index) => {
          const laterSegment = laterSegments[index];
          if (segment === laterSegment) return true;
          return segment.startsWith(':') && !laterSegment.startsWith(':');
        });
        if (shadows) {
          shadowed.push(`${earlier.method} ${earlier.routePath} shadows ${later.method} ${later.routePath}`);
        }
      });
    });

    expect(shadowed).toEqual([]);
  });

  it.each(routeFiles)('%s never registers the same method and path twice', (file) => {
    const seen = new Set();
    const duplicates = [];

    describeRoutes(loadRouter(file)).forEach((route) => {
      const key = `${route.method} ${route.routePath}`;
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    });

    expect(duplicates).toEqual([]);
  });

  it.each(routeFiles)('%s requires authentication on every route, or is guarded where it is mounted', (file) => {
    const name = file.replace('.ts', '');
    const { requireAuth } = require('../../middleware/auth');
    const routes = describeRoutes(loadRouter(file));
    const unauthenticated = routes
      .filter((route) => !route.handlers.includes(requireAuth))
      .map((route) => `${route.method} ${route.routePath}`);

    if (unauthenticated.length === 0) return;
    // The remaining routers are the documented exceptions, and the reason is recorded above.
    expect(Object.keys(guardedElsewhere).concat(mountGuarded)).toContain(name);
  });
});

// Routers with no in-router requireAuth that index.ts mounts behind requireAuth.
const indexSource = fs.readFileSync(path.resolve(routesDir, '..', 'index.ts'), 'utf8');
const mountLines = indexSource
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith("app.use('/api/") && line.includes('Routes'));

const mountGuarded = mountLines
  .filter((line) => line.includes('requireAuth'))
  .map((line) => line.match(/([A-Za-z]+Routes)\)/)?.[1])
  .filter(Boolean);

describe('API mount points in index.ts', () => {
  it('mounts every API router under an /api prefix', () => {
    expect(mountLines.length).toBeGreaterThan(30);
  });

  it('puts requireAuth in front of every mounted router except the documented public ones', () => {
    const publicMounts = [
      'translationRoutes',
      'systemRoutes',
      'telegramStudentRoutes',
      'consolidatePublicRoutes',
      'testSharePublicRoutes',
    ];
    const unguarded = mountLines
      .filter((line) => !line.includes('requireAuth'))
      .map((line) => line.match(/([A-Za-z]+Routes)\)/)?.[1])
      .filter(Boolean);

    expect(unguarded.sort()).toEqual(publicMounts.sort());
  });

  it('keeps the request log API restricted to superusers', () => {
    const line = mountLines.find((entry) => entry.includes('requestLogRoutes'));

    expect(line).toContain('requireAuth');
    expect(line).toContain("requireRole('superuser')");
  });

  it('keeps the student portal restricted to the student role', () => {
    const line = mountLines.find((entry) => entry.includes('portalRoutes'));

    expect(line).toContain("requireRole('student')");
  });

  it('keeps owner administration behind the owner guard', () => {
    const line = mountLines.find((entry) => entry.includes('ownerRoutes'));

    expect(line).toContain('requireOwner');
  });
});
