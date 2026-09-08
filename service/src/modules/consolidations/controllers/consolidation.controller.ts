const { getCenterScope, sendScopeError } = require('../../../shared/controller');
const { logAudit } = require('../../../utils/audit');
const consolidationService = require('../services/consolidation.service');

const requireConsolidationCenterScope = (req: any, res: any) => {
  const scope = getCenterScope(req, { requireConcreteCenter: true });
  if (sendScopeError(res, scope)) return undefined;
  return scope;
};

const createSet = async (req: any, res: any) => {
  try {
    const scope = requireConsolidationCenterScope(req, res);
    if (!scope) return;
    const result = await consolidationService.createSet(req.body, callerScope(req, scope));
    if (result?.error === 'session_not_found') return res.status(404).json({ error: 'Session not found' });
    if (result?.error === 'forbidden') return res.status(403).json({ error: 'You do not teach this session.' });
    if (result?.error === 'already_exists') return res.status(409).json({ error: 'A consolidation set already exists for this session.' });
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'CREATE',
      entity_type: 'consolidation_set',
      entity_id: result.set.consolidation_set_id,
      details: { session_id: result.set.session_id },
      ip_address: req.ip,
    });
    res.status(201).json({ message: 'Consolidation set created', set: result.set, words: result.words });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create consolidation set', details: error.message || String(error) });
  }
};

const callerScope = (req: any, scope: any) => ({
  userType: req.user?.userType,
  teacherId: req.user?.userType === 'teacher' ? Number(req.user.id) : undefined,
  centerId: scope.centerId ?? undefined,
});

const getSetForTeacher = async (req: any, res: any) => {
  try {
    const scope = requireConsolidationCenterScope(req, res);
    if (!scope) return;
    const data = await consolidationService.getSetForTeacher(Number(req.params.sessionId), scope.centerId ?? undefined, callerScope(req, scope));
    if (!data) return res.status(404).json({ error: 'No consolidation set for this session.' });
    if (data.error === 'forbidden') return res.status(403).json({ error: 'You do not teach this session.' });
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch consolidation set', details: error.message || String(error) });
  }
};

const getSetForStudentView = async (req: any, res: any) => {
  try {
    const scope = requireConsolidationCenterScope(req, res);
    if (!scope) return;
    const studentId = Number(req.user?.id);
    const data = await consolidationService.getSetForStudentView(Number(req.params.sessionId), scope.centerId ?? undefined, studentId);
    if (!data) return res.status(404).json({ error: 'No consolidation set for this session.' });
    if (data.error === 'forbidden') return res.status(403).json({ error: 'You are not enrolled in this class.' });
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch exercise', details: error.message || String(error) });
  }
};

const getResultsDashboard = async (req: any, res: any) => {
  try {
    const scope = requireConsolidationCenterScope(req, res);
    if (!scope) return;
    const data = await consolidationService.getResultsDashboard(Number(req.params.sessionId), scope.centerId ?? undefined, callerScope(req, scope));
    if (!data) return res.status(404).json({ error: 'No consolidation set for this session.' });
    if (data.error === 'forbidden') return res.status(403).json({ error: 'You do not teach this session.' });
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch results', details: error.message || String(error) });
  }
};

const getOverview = async (req: any, res: any) => {
  try {
    const scope = requireConsolidationCenterScope(req, res);
    if (!scope) return;
    const data = await consolidationService.getConsolidationsOverview(scope.centerId ?? undefined);
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch consolidations overview', details: error.message || String(error) });
  }
};

const getTrialDetail = async (req: any, res: any) => {
  try {
    const scope = requireConsolidationCenterScope(req, res);
    if (!scope) return;
    const data = await consolidationService.getTrialDetail(Number(req.params.trialId), {
      userType: req.user?.userType,
      id: req.user?.id,
      centerId: scope.centerId ?? undefined,
    });
    if (!data) return res.status(404).json({ error: 'Trial not found' });
    if (data.error === 'forbidden') return res.status(403).json({ error: 'Access denied.' });
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch trial', details: error.message || String(error) });
  }
};

const startTrial = async (req: any, res: any) => {
  try {
    const result = await consolidationService.startTrial(Number(req.params.setId), Number(req.user?.id));
    if (!result) return res.status(404).json({ error: 'Consolidation set not found' });
    if (result.error === 'forbidden') return res.status(403).json({ error: 'You are not enrolled in this class.' });
    res.status(201).json({ message: 'Trial started', trial: result.trial, words: result.words });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to start trial', details: error.message || String(error) });
  }
};

const requireOwnInProgressTrial = async (req: any, res: any) => {
  const trial = await consolidationService.getTrial(Number(req.params.trialId));
  if (!trial) {
    res.status(404).json({ error: 'Trial not found' });
    return null;
  }
  if (Number(trial.student_id) !== Number(req.user?.id)) {
    res.status(403).json({ error: 'Access denied.' });
    return null;
  }
  return trial;
};

const saveAnswer = async (req: any, res: any) => {
  try {
    const trial = await requireOwnInProgressTrial(req, res);
    if (!trial) return;
    const result = await consolidationService.saveAnswer(Number(req.params.trialId), req.body.consolidation_word_id, req.body.answer ?? null, trial);
    if (!result) return res.status(404).json({ error: 'Trial not found' });
    if (result.error === 'not_in_progress') return res.status(409).json({ error: 'This trial is no longer in progress.' });
    res.json({ message: 'Answer saved', answer: result });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to save answer', details: error.message || String(error) });
  }
};

const submitTrial = async (req: any, res: any) => {
  try {
    const trial = await requireOwnInProgressTrial(req, res);
    if (!trial) return;
    const updated = await consolidationService.submitTrial(Number(req.params.trialId), trial);
    res.json({ message: 'Trial submitted', trial: updated });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to submit trial', details: error.message || String(error) });
  }
};

const logViolation = async (req: any, res: any) => {
  try {
    const trial = await requireOwnInProgressTrial(req, res);
    if (!trial) return;
    await consolidationService.logViolation(Number(req.params.trialId), trial);
    res.status(204).end();
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(204).end();
  }
};

const deleteSet = async (req: any, res: any) => {
  try {
    const scope = requireConsolidationCenterScope(req, res);
    if (!scope) return;
    const result = await consolidationService.deleteSet(Number(req.params.setId), scope.centerId ?? undefined, callerScope(req, scope));
    if (!result) return res.status(404).json({ error: 'Consolidation set not found' });
    if (result.error === 'forbidden') return res.status(403).json({ error: 'You do not teach this session.' });
    if (result.error === 'has_trials') return res.status(409).json({ error: 'Cannot delete a set with existing trials.' });
    res.json({ message: 'Consolidation set deleted', set: result });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete consolidation set', details: error.message || String(error) });
  }
};

const regenerateLink = async (req: any, res: any) => {
  try {
    const scope = requireConsolidationCenterScope(req, res);
    if (!scope) return;
    const result = await consolidationService.regenerateLink(Number(req.params.setId), scope.centerId ?? undefined, callerScope(req, scope));
    if (!result) return res.status(404).json({ error: 'Consolidation set not found' });
    if (result.error === 'forbidden') return res.status(403).json({ error: 'You do not teach this session.' });
    res.json({ message: 'Link regenerated', set: result });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to regenerate link', details: error.message || String(error) });
  }
};

// --- Public share-link handlers ---------------------------------------------

const getPublicSetView = async (req: any, res: any) => {
  try {
    const data = await consolidationService.getPublicSetView(req.params.shareToken);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(404).json({ error: 'Not found' });
  }
};

const startPublicTrial = async (req: any, res: any) => {
  try {
    const result = await consolidationService.startPublicTrial(req.params.shareToken, req.body.username, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
      confirm: Boolean(req.body.confirm),
    });
    if (result.error === 'not_found') return res.status(404).json({ error: 'Not found' });
    if (result.error === 'invalid_student') return res.status(400).json({ error: 'Invalid username.' });
    if (result.needs_confirmation) {
      return res.status(200).json({ needs_confirmation: true, existing_today: result.existing_today });
    }
    res.status(201).json({ message: 'Trial started', trial: result.trial, words: result.words, existing_today: result.existing_today ?? null });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(404).json({ error: 'Not found' });
  }
};

const requirePublicTrialScope = async (req: any, res: any) => {
  const resolved = await consolidationService.resolveTrialForToken(req.params.shareToken, Number(req.params.trialId), req.body?.trial_token);
  if (!resolved) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }
  return resolved;
};

const savePublicAnswer = async (req: any, res: any) => {
  try {
    const resolved = await requirePublicTrialScope(req, res);
    if (!resolved) return;
    const result = await consolidationService.saveAnswer(Number(req.params.trialId), req.body.consolidation_word_id, req.body.answer ?? null, resolved.trial);
    if (!result || result.error) return res.status(409).json({ error: 'This trial is no longer in progress.' });
    res.json({ message: 'Answer saved', answer: result });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(404).json({ error: 'Not found' });
  }
};

const submitPublicTrial = async (req: any, res: any) => {
  try {
    const resolved = await requirePublicTrialScope(req, res);
    if (!resolved) return;
    const updated = await consolidationService.submitTrial(Number(req.params.trialId), resolved.trial);
    res.json({ message: 'Trial submitted', trial: updated });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(404).json({ error: 'Not found' });
  }
};

const logPublicViolation = async (req: any, res: any) => {
  try {
    const resolved = await requirePublicTrialScope(req, res);
    if (!resolved) return;
    await consolidationService.logViolation(Number(req.params.trialId), resolved.trial);
    res.status(204).end();
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(204).end();
  }
};

module.exports = {
  createSet,
  getSetForTeacher,
  getSetForStudentView,
  getResultsDashboard,
  getOverview,
  getTrialDetail,
  startTrial,
  saveAnswer,
  submitTrial,
  logViolation,
  deleteSet,
  regenerateLink,
  getPublicSetView,
  startPublicTrial,
  savePublicAnswer,
  submitPublicTrial,
  logPublicViolation,
};

export {};
