// Owner → SMS → Templates, in two sections: attendance warnings, and payments (a reminder or a
// receipt). The active template of a type is used for every send of that type (admins' payment
// notices, teachers' missed lessons); with none active the built-in text is used.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { smsAPI } from './api';
import { PLACEHOLDER_LABELS, TEMPLATE_GROUPS, TEMPLATE_KIND_LABELS, groupOfKind, insertAt, previewTemplate, smsLength } from './smsTemplateText';

interface SmsTemplate {
  template_id: number;
  kind: string;
  name: string;
  body: string;
  is_active: boolean;
  updated_at: string | null;
}

interface TemplateKind {
  kind: string;
  placeholders: string[];
  example: string;
}

interface Draft {
  id: number | null;
  kind: string;
  name: string;
  body: string;
}

const SmsTemplatesPanel = () => {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [kinds, setKinds] = useState<TemplateKind[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const data = getApiPayload<{ templates: SmsTemplate[]; kinds: TemplateKind[] }>(await smsAPI.getTemplates());
      setTemplates(data?.templates ?? []);
      setKinds(data?.kinds ?? []);
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't load the templates"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    smsAPI.getTemplates()
      .then((response) => {
        if (!active) return;
        const data = getApiPayload<{ templates: SmsTemplate[]; kinds: TemplateKind[] }>(response);
        setTemplates(data?.templates ?? []);
        setKinds(data?.kinds ?? []);
      })
      .catch((error) => {
        if (active) showToast.error(getErrorMessage(error) || t("Couldn't load the templates"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  // A section's types in the section's own order (the payment reminder first), as the server knows them.
  const kindsOf = (groupKinds: readonly string[]) =>
    groupKinds.map((id) => kinds.find((kind) => kind.kind === id)).filter((kind): kind is TemplateKind => Boolean(kind));
  const draftKind = kinds.find((kind) => kind.kind === draft?.kind);
  const draftGroup = draft ? groupOfKind(draft.kind) : undefined;
  const kindChoices = draftGroup ? kindsOf(draftGroup.kinds) : [];

  // Switching a new payment template between reminder and receipt swaps in that type's example,
  // unless the text was already changed.
  const chooseKind = (kind: TemplateKind) => {
    if (!draft) return;
    const untouched = !draft.body.trim() || draft.body === draftKind?.example;
    setDraft({ ...draft, kind: kind.kind, body: untouched ? kind.example : draft.body });
  };

  const insertPlaceholder = (key: string) => {
    if (!draft) return;
    const field = bodyRef.current;
    const start = field?.selectionStart ?? draft.body.length;
    const end = field?.selectionEnd ?? draft.body.length;
    const next = insertAt(draft.body, `{${key}}`, start, end);
    setDraft({ ...draft, body: next.text });
    window.requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(next.cursor, next.cursor);
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      if (draft.id) await smsAPI.updateTemplate(draft.id, { name: draft.name, body: draft.body });
      else await smsAPI.createTemplate({ kind: draft.kind, name: draft.name, body: draft.body });
      showToast.success(t('Template saved'));
      setDraft(null);
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't save the template"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (template: SmsTemplate, active: boolean) => {
    setBusyId(template.template_id);
    try {
      await smsAPI.setTemplateActive(template.template_id, active);
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't change the template"));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (template: SmsTemplate) => {
    if (!window.confirm(t('Delete the template "{name}"?', { name: template.name }))) return;
    setBusyId(template.template_id);
    try {
      await smsAPI.deleteTemplate(template.template_id);
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't delete the template"));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t('Loading...')}
      </div>
    );
  }

  const preview = draft ? previewTemplate(draft.body) : '';
  const length = smsLength(preview);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('Write your own text for each SMS type. The active template is used every time that SMS is sent; with none active, the standard text is used.')}
      </p>

      {TEMPLATE_GROUPS.map((group) => {
        const groupKinds = kindsOf(group.kinds);
        if (groupKinds.length === 0) return null;
        const own = templates.filter((template) => (group.kinds as readonly string[]).includes(template.kind));
        const several = groupKinds.length > 1;
        return (
          <section key={group.id} className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">{t(group.title)}</h2>
                {groupKinds.map((kind) => {
                  const active = own.find((template) => template.kind === kind.kind && template.is_active);
                  const inUse = active ? t('In use: {name}', { name: active.name }) : t('In use: the standard text');
                  return (
                    <p key={kind.kind} className="text-xs text-muted-foreground">
                      {several ? `${t(TEMPLATE_KIND_LABELS[kind.kind] || kind.kind)} — ${inUse}` : inUse}
                    </p>
                  );
                })}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setDraft({ id: null, kind: groupKinds[0].kind, name: '', body: groupKinds[0].example })}>
                <Plus className="mr-1.5 h-4 w-4" /> {t('New template')}
              </Button>
            </div>

            {own.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No templates yet.')}</p>
            ) : (
              <ul className="space-y-2">
                {own.map((template) => (
                  <li
                    key={template.template_id}
                    className={cn('rounded-lg border p-3', template.is_active && 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/30')}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{template.name}</span>
                        {several && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {t(TEMPLATE_KIND_LABELS[template.kind] || template.kind)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs font-medium">
                          <Switch
                            checked={template.is_active}
                            disabled={busyId === template.template_id}
                            onCheckedChange={(checked) => void toggleActive(template, checked)}
                            aria-label={t('Use this template')}
                          />
                          {template.is_active ? t('In use') : t('Not in use')}
                        </label>
                        <Button type="button" size="sm" variant="ghost" className="h-8 px-2" aria-label={t('Edit')}
                          onClick={() => setDraft({ id: template.template_id, kind: template.kind, name: template.name, body: template.body })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-rose-600" aria-label={t('Delete')}
                          disabled={busyId === template.template_id} onClick={() => void remove(template)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{template.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <Dialog open={draft !== null} onOpenChange={(open) => { if (!open && !saving) setDraft(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? t('Edit template') : t('New template')}</DialogTitle>
            <DialogDescription>{draft ? t(groupOfKind(draft.kind)?.title || draft.kind) : ''}</DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              {!draft.id && kindChoices.length > 1 && (
                <div className="space-y-1">
                  <Label>{t('Type')}</Label>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('Type')}>
                    {kindChoices.map((kind) => (
                      <button
                        key={kind.kind}
                        type="button"
                        role="radio"
                        aria-checked={draft.kind === kind.kind}
                        onClick={() => chooseKind(kind)}
                        className={cn(
                          'rounded-md border px-3 py-1.5 text-sm font-medium transition',
                          draft.kind === kind.kind ? 'border-emerald-600 bg-emerald-600 text-white' : 'hover:bg-muted'
                        )}
                      >
                        {t(TEMPLATE_KIND_LABELS[kind.kind] || kind.kind)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="sms-template-name">{t('Template name')}</Label>
                <Input id="sms-template-name" value={draft.name} maxLength={120} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sms-template-body">{t('Text')}</Label>
                <Textarea id="sms-template-body" ref={bodyRef} rows={5} maxLength={1000} value={draft.body}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {draftKind?.placeholders.map((key) => (
                    <button key={key} type="button" onClick={() => insertPlaceholder(key)} title={t(PLACEHOLDER_LABELS[key] || key)}
                      className="rounded-md border bg-muted/50 px-2 py-0.5 font-mono text-xs hover:bg-muted">
                      {`{${key}}`} <span className="font-sans text-muted-foreground">{t(PLACEHOLDER_LABELS[key] || key)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t('Preview')}</Label>
                <p className="whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-3 text-sm">{preview || '—'}</p>
                <p className={cn('text-xs', length.parts > 2 ? 'text-amber-600' : 'text-muted-foreground')}>
                  {t('{characters} characters · {parts} SMS per parent', { characters: length.characters, parts: length.parts })}
                  {!length.latin && ` · ${t('Letters outside plain Latin make each SMS shorter (70 characters).')}`}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={saving}>{t('Cancel')}</Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !draft?.name.trim() || !draft?.body.trim()}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmsTemplatesPanel;
