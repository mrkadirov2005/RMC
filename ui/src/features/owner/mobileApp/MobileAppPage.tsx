// @MOB-160 @MOB-161 @MOB-162 @MOB-164 Mobile app content: announcements, rules, official links and
// the requests students and parents send from the app.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/i18n/LanguageContext';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { showToast } from '@/utils/toast';
import { classAPI, mobileAdminAPI, type MobileAdoption, type MobileAnnouncement, type MobileHelpRequest, type MobileLink, type MobilePolicy } from './api';

const TABS = [
  { id: 'usage', label: 'Usage' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'rules', label: 'Rules' },
  { id: 'links', label: 'Official links' },
  { id: 'requests', label: 'Requests' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const selectClass = 'h-9 rounded-md border border-input bg-background px-2 text-sm';
const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB') : '');

// Loads a list, reloads it after changes, and reports failures once.
function useList<T>(load: () => Promise<unknown>) {
  const { t } = useLanguage();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(unwrapApiRows<T>(await load()));
    } catch {
      showToast.error(t('Could not load the data.'));
    } finally {
      setLoading(false);
    }
  }, [load, t]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { items, loading, reload };
}

function Empty({ loading }: { loading: boolean }) {
  const { t } = useLanguage();
  return <p className="py-6 text-center text-sm text-muted-foreground">{loading ? '…' : t('Nothing here yet.')}</p>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

// @MOB-161
function AnnouncementsTab() {
  const { t } = useLanguage();
  const list = useList<MobileAnnouncement>(mobileAdminAPI.announcements);
  const [classes, setClasses] = useState<{ class_id: number; class_name: string }[]>([]);
  const [form, setForm] = useState({ title: '', body: '', audience: 'all', class_id: '', send_push: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    classAPI.getAll().then((response) => setClasses(unwrapApiRows(response))).catch(() => setClasses([]));
  }, []);

  const publish = async () => {
    setSaving(true);
    try {
      const response = await mobileAdminAPI.createAnnouncement({
        title: form.title,
        body: form.body,
        audience: form.audience,
        class_id: form.class_id ? Number(form.class_id) : null,
        send_push: form.send_push,
      });
      const queued = Number(getApiPayload<{ queued: number }>(response)?.queued || 0);
      showToast.success(form.send_push ? t('Published. Push queued for {count} people.', { count: queued }) : t('Published'));
      setForm({ title: '', body: '', audience: 'all', class_id: '', send_push: true });
      void list.reload();
    } catch {
      showToast.error(t('Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    await mobileAdminAPI.deleteAnnouncement(id).catch(() => null);
    showToast.success(t('Deleted'));
    void list.reload();
  };

  const audienceLabel = { all: t('All students and parents'), student: t('Students only'), parent: t('Parents only') };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardContent className="grid gap-3 pt-5">
          <h3 className="font-semibold">{t('New announcement')}</h3>
          <Field label={t('Title')}>
            <Input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label={t('Text')}>
            <Textarea rows={5} value={form.body} maxLength={5000} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('Audience')}>
              <select className={selectClass} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="all">{audienceLabel.all}</option>
                <option value="student">{audienceLabel.student}</option>
                <option value="parent">{audienceLabel.parent}</option>
              </select>
            </Field>
            <Field label={t('Classes')}>
              <select className={selectClass} value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
                <option value="">{t('All groups')}</option>
                {classes.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.send_push} onChange={(e) => setForm({ ...form, send_push: e.target.checked })} />
            {t('Send a push notification')}
          </label>
          <Button disabled={saving || !form.title.trim() || !form.body.trim()} onClick={() => void publish()}>
            {t('Publish')}
          </Button>
        </CardContent>
      </Card>
      <div className="grid content-start gap-3">
        {list.items.length === 0 && <Empty loading={list.loading} />}
        {list.items.map((a) => (
          <Card key={a.announcement_id}>
            <CardContent className="pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold">{a.title}</h4>
                <Badge variant="secondary">{audienceLabel[a.audience]}</Badge>
                {a.class_name && <Badge variant="outline">{a.class_name}</Badge>}
                {a.send_push && <Badge variant="info">Push</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{date(a.published_at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => void remove(a.announcement_id)}>
                  {t('Delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// @MOB-162
function RulesTab() {
  const { t } = useLanguage();
  const list = useList<MobilePolicy>(mobileAdminAPI.policies);
  const [form, setForm] = useState({ title: '', body: '', requires_acceptance: true });
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const create = async () => {
    try {
      await mobileAdminAPI.createPolicy(form);
      showToast.success(t('Saved'));
      setForm({ title: '', body: '', requires_acceptance: true });
      void list.reload();
    } catch {
      showToast.error(t('Could not save.'));
    }
  };

  const publishVersion = async (policy: MobilePolicy) => {
    try {
      await mobileAdminAPI.publishPolicyVersion(policy.policy_id, { body: drafts[policy.policy_id], requires_acceptance: policy.requires_acceptance });
      showToast.success(t('Published'));
      setDrafts({ ...drafts, [policy.policy_id]: '' });
      void list.reload();
    } catch {
      showToast.error(t('Could not save.'));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardContent className="grid gap-3 pt-5">
          <h3 className="font-semibold">{t('New rule')}</h3>
          <Field label={t('Title')}>
            <Input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label={t('Text')}>
            <Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.requires_acceptance} onChange={(e) => setForm({ ...form, requires_acceptance: e.target.checked })} />
            {t('Requires acceptance')}
          </label>
          <Button disabled={!form.title.trim() || !form.body.trim()} onClick={() => void create()}>
            {t('Publish')}
          </Button>
        </CardContent>
      </Card>
      <div className="grid content-start gap-3">
        {list.items.length === 0 && <Empty loading={list.loading} />}
        {list.items.map((p) => (
          <Card key={p.policy_id}>
            <CardContent className="grid gap-2 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold">{p.title}</h4>
                <Badge variant="secondary">{t('Version {version}', { version: p.current_version })}</Badge>
                {p.center_id == null && <Badge variant="outline">{t('All centers')}</Badge>}
                {p.requires_acceptance && <Badge variant="success">{t('Accepted by {count}', { count: p.accepted_count })}</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{date(p.published_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{p.body}</p>
              <Textarea
                rows={3}
                placeholder={t('New version text')}
                value={drafts[p.policy_id] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [p.policy_id]: e.target.value })}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{t('Everyone must accept a new version again.')}</span>
                <Button size="sm" variant="outline" disabled={!drafts[p.policy_id]?.trim()} onClick={() => void publishVersion(p)}>
                  {t('Publish new version')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// @MOB-160
function LinksTab() {
  const { t } = useLanguage();
  const list = useList<MobileLink>(mobileAdminAPI.links);
  const [form, setForm] = useState({ title: '', url: '', icon: '' });

  const add = async () => {
    try {
      await mobileAdminAPI.createLink({ title: form.title, url: form.url, icon: form.icon || undefined, sort_order: list.items.length });
      setForm({ title: '', url: '', icon: '' });
      showToast.success(t('Saved'));
      void list.reload();
    } catch {
      showToast.error(t('Could not save.'));
    }
  };

  const change = async (action: Promise<unknown>) => {
    try {
      await action;
      void list.reload();
    } catch {
      showToast.error(t('Could not save.'));
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-[1fr_2fr_120px_auto] md:items-end">
          <Field label={t('Title')}>
            <Input value={form.title} placeholder="Telegram" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="URL">
            <Input value={form.url} placeholder="https://t.me/…" onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </Field>
          <Field label={t('Icon (emoji)')}>
            <Input value={form.icon} maxLength={4} placeholder="✈️" onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </Field>
          <Button disabled={!form.title.trim() || !/^https?:\/\//i.test(form.url.trim())} onClick={() => void add()}>
            {t('Add link')}
          </Button>
        </CardContent>
      </Card>
      {list.items.length === 0 && <Empty loading={list.loading} />}
      {list.items.map((link) => (
        <Card key={link.link_id}>
          <CardContent className="flex flex-wrap items-center gap-3 pt-5">
            <span className="text-xl">{link.icon || '🔗'}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{link.title}</div>
              <a className="break-all text-sm text-primary" href={link.url} target="_blank" rel="noreferrer">
                {link.url}
              </a>
            </div>
            {link.center_id == null && <Badge variant="outline">{t('All centers')}</Badge>}
            <Badge variant={link.is_active ? 'success' : 'secondary'}>{link.is_active ? t('Shown in the app') : t('Hidden')}</Badge>
            <Button size="sm" variant="outline" onClick={() => void change(mobileAdminAPI.updateLink(link.link_id, { is_active: !link.is_active }))}>
              {link.is_active ? t('Hide') : t('Show')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void change(mobileAdminAPI.deleteLink(link.link_id))}>
              {t('Delete')}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// @MOB-164
function RequestsTab() {
  const { t } = useLanguage();
  const [status, setStatus] = useState('');
  const load = useCallback(() => mobileAdminAPI.helpRequests(status || undefined), [status]);
  const list = useList<MobileHelpRequest>(load);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const kindLabel = { help: t('Help'), complaint: t('Complaint'), thanks: t('Thanks'), suggestion: t('Suggestion') };
  const statusLabel = { submitted: t('New request'), in_review: t('In review'), resolved: t('Resolved') };
  const statusVariant = { submitted: 'info', in_review: 'warning', resolved: 'success' } as const;

  const update = async (id: number, data: { status?: string; response?: string }) => {
    try {
      await mobileAdminAPI.updateHelpRequest(id, data);
      if (data.response) showToast.success(t('Answer sent'));
      setAnswers({ ...answers, [id]: '' });
      void list.reload();
    } catch {
      showToast.error(t('Could not save.'));
    }
  };

  return (
    <div className="grid gap-3">
      <div>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('Status')}>
          <option value="">{t('All')}</option>
          <option value="submitted">{statusLabel.submitted}</option>
          <option value="in_review">{statusLabel.in_review}</option>
          <option value="resolved">{statusLabel.resolved}</option>
        </select>
      </div>
      {list.items.length === 0 && <Empty loading={list.loading} />}
      {list.items.map((r) => (
        <Card key={r.request_id}>
          <CardContent className="grid gap-2 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={r.kind === 'complaint' ? 'destructive' : 'secondary'}>{kindLabel[r.kind]}</Badge>
              <span className="font-semibold">{r.sender_name || '—'}</span>
              <span className="text-xs text-muted-foreground">{r.user_type === 'parent' ? t('Parent') : t('Student')}</span>
              <Badge variant={statusVariant[r.status]} className="ml-auto">
                {statusLabel[r.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">{date(r.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{r.message}</p>
            {r.response && <p className="rounded-md bg-muted p-2 text-sm">{r.response}</p>}
            {r.status !== 'resolved' && (
              <div className="grid gap-2">
                <Textarea rows={2} placeholder={t('Write an answer…')} value={answers[r.request_id] ?? ''} onChange={(e) => setAnswers({ ...answers, [r.request_id]: e.target.value })} />
                <div className="flex justify-end gap-2">
                  {r.status === 'submitted' && (
                    <Button size="sm" variant="outline" onClick={() => void update(r.request_id, { status: 'in_review' })}>
                      {t('Mark in review')}
                    </Button>
                  )}
                  <Button size="sm" disabled={!answers[r.request_id]?.trim()} onClick={() => void update(r.request_id, { status: 'resolved', response: answers[r.request_id] })}>
                    {t('Send answer')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// @MOB-166 How many families use the app: signed in at least once, active in the last 7 days,
// and homework sent from it.
function UsageTab() {
  const { t } = useLanguage();
  const [data, setData] = useState<MobileAdoption | null>(null);
  useEffect(() => {
    mobileAdminAPI
      .adoption()
      .then((response) => setData(getApiPayload<MobileAdoption>(response)))
      .catch(() => showToast.error(t('Could not load the data.')));
  }, [t]);
  if (!data) return <Empty loading />;

  const share = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');
  const tiles = [
    { label: t('Parents in the app'), value: data.parents_signed_in, note: t('{share} of {total} parents', { share: share(data.parents_signed_in, data.parents_total), total: data.parents_total }) },
    { label: t('Students in the app'), value: data.students_signed_in, note: t('{share} of {total} active students', { share: share(data.students_signed_in, data.students_total), total: data.students_total }) },
    { label: t('Active parents, last 7 days'), value: data.parents_weekly_active, note: null },
    { label: t('Active students, last 7 days'), value: data.students_weekly_active, note: null },
    { label: t('Homework sent, last 7 days'), value: data.homework_submitted_week, note: t('{total} in total', { total: data.homework_submitted_total }) },
    { label: t('Link requests waiting'), value: data.link_requests_pending, note: t('Approve them under Telegram → Parent requests') },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="grid gap-1 pt-5">
            <span className="text-sm text-muted-foreground">{tile.label}</span>
            <span className="text-3xl font-bold tabular-nums">{tile.value.toLocaleString('en-US')}</span>
            {tile.note && <span className="text-xs text-muted-foreground">{tile.note}</span>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const MobileAppPage = () => {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((item) => item.id === params.get('tab')) ? params.get('tab') : 'usage') as TabId;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div>
        <h1 className="text-2xl font-bold">{t('Mobile app')}</h1>
        <p className="text-sm text-muted-foreground">{t('Content students and parents see in the mobile app.')}</p>
      </div>
      <div className="inline-flex flex-wrap rounded-lg border bg-muted/40 p-1" role="tablist" aria-label={t('Mobile app')}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setParams({ tab: item.id })}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === item.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      {tab === 'usage' && <UsageTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'links' && <LinksTab />}
      {tab === 'requests' && <RequestsTab />}
    </div>
  );
};

export default MobileAppPage;
