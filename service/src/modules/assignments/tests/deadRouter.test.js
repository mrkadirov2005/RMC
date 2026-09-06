// RMC-030 also deleted modules/assignments/routes/assignment.routes.ts entirely:
// it was a dead, unauthenticated duplicate of routes/assignmentRoutes.ts (which
// *is* mounted behind requireAuth). This test pins that the dead file stays
// gone so it can't be accidentally reintroduced (e.g. via a bad merge) without
// the test suite catching it.
const fs = require('fs');
const path = require('path');

describe('assignments dead router (RMC-030)', () => {
  it('does not have a routes/assignment.routes.ts file inside the assignments module', () => {
    const deadRouterPath = path.join(__dirname, '..', 'routes', 'assignment.routes.ts');
    expect(fs.existsSync(deadRouterPath)).toBe(false);
  });

  it('fails to require the dead router module path', () => {
    expect(() => require('../routes/assignment.routes')).toThrow();
  });

  it('the only mounted assignments router remains the authenticated one at src/routes/assignmentRoutes.ts', () => {
    const mountedRouterPath = path.join(__dirname, '..', '..', '..', 'routes', 'assignmentRoutes.ts');
    expect(fs.existsSync(mountedRouterPath)).toBe(true);
    const source = fs.readFileSync(mountedRouterPath, 'utf8');
    expect(source).toMatch(/requireAuth/);
  });
});
