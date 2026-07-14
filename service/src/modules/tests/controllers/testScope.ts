const { getCenterScope, sendScopeError } = require('../../../shared/controller');

const requireTestCenterScope = (req: any, res: any) => {
  const scope = getCenterScope(req, { requireConcreteCenter: true });
  if (sendScopeError(res, scope)) return undefined;
  return scope.centerId;
};

module.exports = {
  requireTestCenterScope,
};

export {};
