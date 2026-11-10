// A subject's levels in the subject window: each level's price and its groups. Admins add levels
// and put groups in them; only the developer sets or changes a level's price. Groups take their
// level's price; a level price change counts from its month for every group in the level.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { History, Layers3, Loader2, LogOut, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAppSelector } from '@/features/crm/hooks';
import { getCenterMonthKey } from '@/shared/billingPeriod';
import { refreshGroupPrices } from '@/shared/groupPrices';
import { ChangeGroupPriceDialog } from '@/features/crm/payments/components/ChangeGroupPriceDialog';
import { PriceHistoryTable } from '@/features/crm/payments/components/PriceHistoryTable';
import { formatMoney, formatMonth, type PriceHistoryEntry } from '@/features/crm/payments/priceHistory';
import { levelsAPI, type LevelGroup, type SubjectLevel, type SubjectLevels } from '../levels';

const shiftMonth = (monthKey: string, count: number) => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const errorText = (error: any, fallback: string) => error?.response?.data?.error || fallback;

interface GroupOption {
  class_id: number;
  class_name: string;
  level_id?: number | null;
  level_name?: string | null;
}

interface Props {
  subjectId: number;
  /** All groups of the center, for "Add group". */
  groups: GroupOption[];
  /** Called after groups moved, so the page can reload its groups. */
  onGroupsChanged?: () => void;
}

type Move = { group: LevelGroup | null; level: SubjectLevel | null; leaving: boolean };

export const SubjectLevelsPanel = ({ subjectId, groups, onGroupsChanged }: Props) => {
  const { t } = useLanguage();
  const user = useAppSelector((state) => state.auth.user);
  const isDeveloper = user?.userType === 'superuser' && user?.is_developer === true;
  const permissions: string[] = user?.permissions || [];
  const canManage =
    user?.userType === 'superuser' &&
    (isDeveloper || String(user?.role || '').toLowerCase() === 'owner' || permissions.includes('CRUD_SUBJECT') || permissions.includes('CRUD_CLASS'));

  const [data, setData] = useState<SubjectLevels | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nameDialog, setNameDialog] = useState<{ level: SubjectLevel | null } | null>(null);
  const [priceLevel, setPriceLevel] = useState<SubjectLevel | null>(null);
  const [move, setMove] = useState<Move | null>(null);
  const [historyOf, setHistoryOf] = useState<number | null>(null);
  const [histories, setHistories] = useState<Record<number, PriceHistoryEntry[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await levelsAPI.forSubject(subjectId);
      setData(response.data);
    } catch (err) {
      setError(errorText(err, t('Could not load the levels.')));
    } finally {
      setLoading(false);
    }
  }, [subjectId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadHistory = async (levelId: number) => {
    try {
      const response = await levelsAPI.history(levelId);
      setHistories((current) => ({ ...current, [levelId]: response.data.items }));
    } catch (err) {
      setActionError(errorText(err, t('Could not load the price history.')));
    }
  };

  const toggleHistory = (levelId: number) => {
    if (historyOf === levelId) return setHistoryOf(null);
    setHistoryOf(levelId);
    void loadHistory(levelId);
  };

  const afterChange = async (levelId?: number) => {
    await load();
    void refreshGroupPrices();
    onGroupsChanged?.();
    if (levelId && historyOf === levelId) void loadHistory(levelId);
  };

  const removeLevel = async (level: SubjectLevel) => {
    setActionError(null);
    try {
      await levelsAPI.remove(level.level_id);
      await load();
    } catch (err) {
      setActionError(errorText(err, t('Could not delete the level.')));
    }
  };

  const groupRow = (group: LevelGroup, level: SubjectLevel | null) => (
    <div key={group.class_id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1.5 text-xs dark:border-border">
      <div className="min-w-0">
        <div className="truncate font-semibold text-slate-900 dark:text-foreground">{group.class_name}</div>
        <div className="text-muted-foreground">
          {[group.teacher_name, group.students != null ? t('{count} students', { count: group.students }) : null,
            group.since ? t('since {month}', { month: formatMonth(group.since) }) : null,
            !level && group.payment_amount != null ? formatMoney(group.payment_amount) : null]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
      {canManage && (
        level ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setMove({ group, level, leaving: true })}>
            <LogOut className="mr-1 h-3.5 w-3.5" />
            {t('Remove from level')}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setMove({ group, level: null, leaving: false })}>
            <Layers3 className="mr-1 h-3.5 w-3.5" />
            {t('Put in a level')}
          </Button>
        )
      )}
    </div>
  );

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('Loading...')}
      </div>
    );
  }
  if (error) return <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>;
  const levels = data?.levels || [];
  const unleveled = data?.unleveled_groups || [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-foreground">
          <Layers3 className="h-4 w-4" />
          {t('Levels')} <span className="text-muted-foreground">({levels.length})</span>
        </h3>
        {canManage && (
          <Button type="button" size="sm" onClick={() => setNameDialog({ level: null })}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t('Add level')}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("Groups take their level's price. A level price change counts from its month for every group in the level; earlier months keep the old price.")}
      </p>

      {actionError && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{actionError}</div>}

      {levels.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t('This subject has no levels yet.')}</p>
      )}

      {levels.map((level) => (
        <div key={level.level_id} className="space-y-2 rounded-md border border-violet-200 bg-violet-50/40 p-3 dark:border-border dark:bg-muted/20">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-foreground">{level.level_name}</div>
              <div className="text-xs font-semibold">
                {level.payment_amount == null ? (
                  <span className="text-amber-700 dark:text-amber-300">{t('No price yet: its groups keep their own price')}</span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-300">{t('{amount} a month', { amount: formatMoney(level.payment_amount) })}</span>
                )}
                <span className="ml-2 text-muted-foreground">
                  <Users className="mr-0.5 inline h-3 w-3" />
                  {level.groups.length}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {isDeveloper && (
                <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => setPriceLevel(level)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  {level.payment_amount == null ? t('Set level price') : t('Change level payment')}
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => toggleHistory(level.level_id)}>
                <History className="mr-1 h-3.5 w-3.5" />
                {t('Price history')}
              </Button>
              {canManage && (
                <>
                  <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setMove({ group: null, level, leaving: false })}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t('Add group')}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={t('Rename')} onClick={() => setNameDialog({ level })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-rose-600"
                    title={level.groups.length ? t('Move its groups out first') : t('Delete')}
                    disabled={level.groups.length > 0}
                    onClick={() => void removeLevel(level)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {historyOf === level.level_id && (
            <div className="rounded border bg-background p-2">
              {histories[level.level_id] ? (
                histories[level.level_id].length ? (
                  <PriceHistoryTable items={histories[level.level_id]} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t('The level has no price yet.')}</p>
                )
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          )}

          <div className="space-y-1">
            {level.groups.length ? level.groups.map((group) => groupRow(group, level)) : (
              <p className="text-xs text-muted-foreground">{t('No groups in this level yet.')}</p>
            )}
          </div>
        </div>
      ))}

      {unleveled.length > 0 && (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50/50 p-3 dark:border-border dark:bg-muted/20">
          <div className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300">
            {t('Groups in no level (own price)')} ({unleveled.length})
          </div>
          {unleveled.map((group) => groupRow(group, null))}
        </div>
      )}

      <LevelNameDialog
        open={Boolean(nameDialog)}
        level={nameDialog?.level || null}
        allowPrice={isDeveloper}
        onOpenChange={(open) => !open && setNameDialog(null)}
        save={async (name, price) => {
          if (nameDialog?.level) await levelsAPI.update(nameDialog.level.level_id, { level_name: name });
          else await levelsAPI.create(subjectId, { level_name: name, ...(price != null ? { payment_amount: price } : {}) });
          await afterChange();
        }}
      />

      {priceLevel && (
        <ChangeGroupPriceDialog
          open={Boolean(priceLevel)}
          onOpenChange={(open) => !open && setPriceLevel(null)}
          classId={0}
          className={priceLevel.level_name}
          currentAmount={priceLevel.payment_amount || 0}
          title={priceLevel.payment_amount == null ? t('Set level price') : t('Change level payment')}
          firstPrice={priceLevel.payment_amount == null}
          save={(body) => levelsAPI.changePrice(priceLevel.level_id, body)}
          onChanged={() => void afterChange(priceLevel.level_id)}
        />
      )}

      <MoveGroupDialog
        move={move}
        levels={levels}
        groups={groups}
        onOpenChange={(open) => !open && setMove(null)}
        save={async (classId, levelId, month) => {
          await levelsAPI.setClassLevel(classId, { level_id: levelId, effective_month: month });
          await afterChange();
        }}
      />
    </div>
  );
};

const LevelNameDialog = ({ open, level, allowPrice, onOpenChange, save }: {
  open: boolean;
  level: SubjectLevel | null;
  allowPrice: boolean;
  onOpenChange: (open: boolean) => void;
  save: (name: string, price: number | null) => Promise<void>;
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(level?.level_name || '');
    setPrice('');
    setError(null);
  }, [open, level]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await save(name.trim(), !level && allowPrice && price !== '' ? Number(price) : null);
      onOpenChange(false);
    } catch (err) {
      setError(errorText(err, t('Could not save the level.')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{level ? t('Rename level') : t('Add level')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="level-name">{t('Level name')}</Label>
            <Input id="level-name" required autoFocus maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Starter, Movers, IELTS individual..." />
          </div>
          {!level && allowPrice && (
            <div className="space-y-1.5">
              <Label htmlFor="level-price">{t('Monthly price (UZS, optional)')}</Label>
              <Input id="level-price" type="number" min={0} step="1000" value={price} onChange={(event) => setPrice(event.target.value)} />
            </div>
          )}
          {!level && !allowPrice && (
            <p className="text-xs text-muted-foreground">{t('The developer sets the level price.')}</p>
          )}
          {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t('Cancel')}</Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const MoveGroupDialog = ({ move, levels, groups, onOpenChange, save }: {
  move: Move | null;
  levels: SubjectLevel[];
  groups: GroupOption[];
  onOpenChange: (open: boolean) => void;
  save: (classId: number, levelId: number | null, month: string) => Promise<void>;
}) => {
  const { t } = useLanguage();
  const thisMonth = getCenterMonthKey();
  const [classId, setClassId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [month, setMonth] = useState(thisMonth);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!move) return;
    setClassId(move.group ? String(move.group.class_id) : '');
    setLevelId(move.level && !move.leaving ? String(move.level.level_id) : '');
    setMonth(getCenterMonthKey());
    setError(null);
  }, [move]);

  const choices = useMemo(
    () => [...groups]
      .filter((group) => !move?.level || Number(group.level_id || 0) !== move.level.level_id)
      .sort((a, b) => String(a.class_name).localeCompare(String(b.class_name))),
    [groups, move]
  );

  if (!move) return null;
  const leaving = move.leaving;
  const valid = Boolean(classId) && (leaving || Boolean(levelId)) && /^\d{4}-\d{2}$/.test(month);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await save(Number(classId), leaving ? null : Number(levelId), month);
      onOpenChange(false);
    } catch (err) {
      setError(errorText(err, t('Could not save the group level.')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{leaving ? t('Remove from level') : t('Put a group in a level')}</DialogTitle>
            <DialogDescription>
              {leaving
                ? t("From this month the group goes back to its own price.")
                : t("From this month the group takes the level's price. Earlier months keep the price they had.")}
            </DialogDescription>
          </DialogHeader>

          {move.group ? (
            <div className="text-sm font-semibold">{move.group.class_name}</div>
          ) : (
            <div className="space-y-1.5">
              <Label>{t('Group')}</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder={t('Choose a group')} /></SelectTrigger>
                <SelectContent>
                  {choices.map((group) => (
                    <SelectItem key={group.class_id} value={String(group.class_id)}>
                      {group.class_name}{group.level_name ? ` (${group.level_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!leaving && (move.level ? (
            <div className="text-sm">{t('Level')}: <span className="font-semibold">{move.level.level_name}</span></div>
          ) : (
            <div className="space-y-1.5">
              <Label>{t('Level')}</Label>
              <Select value={levelId} onValueChange={setLevelId}>
                <SelectTrigger><SelectValue placeholder={t('Choose a level')} /></SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level.level_id} value={String(level.level_id)}>
                      {level.level_name}{level.payment_amount != null ? ` · ${formatMoney(level.payment_amount)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="level-month">{t('From month')}</Label>
            <Input id="level-month" type="month" required min={shiftMonth(thisMonth, -12)} max={thisMonth} value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>

          {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t('Cancel')}</Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
