// Owner → SMS → Templates: their own wording for each SMS type. The active template of a type is
// used for every send of that type (admins' payment notices, teachers' missed lessons); with none
// active the built-in text is used.
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
import { PLACEHOLDER_LABELS, TEMPLATE_KIND_LABELS, insertAt, previewTemplate, smsLength } from './smsTemplateText';

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

  const draftKind = kinds.find((kind) => kind.kind === draft?.kind);

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

      {kinds.map((kind) => {
        const own = templates.filter((template) => template.kind === kind.kind);
        const active = own.find((template) => template.is_active);
        return (
          <section key={kind.kind} className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">{t(TEMPLATE_KIND_LABELS[kind.kind] || kind.kind)}</h2>
                <p className="text-xs text-muted-foreground">
                  {active ? t('In use: {name}', { name: active.name }) : t('In use: the standard text')}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setDraft({ id: null, kind: kind.kind, name: '', body: kind.example })}>
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
                      <span className="font-semibold">{template.name}</span>
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
            <DialogDescription>{draft ? t(TEMPLATE_KIND_LABELS[draft.kind] || draft.kind) : ''}</DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
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
