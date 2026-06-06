import { useEffect, useMemo, useState } from 'react';
import { Check, Languages, PencilLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useLanguage } from '../../i18n/LanguageContext';
import type { TranslationRow } from '../../shared/api/api';
import { showToast } from '../../utils/toast';

type EditableTarget = {
  element: HTMLElement;
  attribute?: 'placeholder' | 'aria-label' | 'title';
  text: string;
};

const TEXT_SELECTOR = [
  'button',
  'a',
  'label',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'span',
  'th',
  'td',
  '[role="button"]',
  '[title]',
  '[aria-label]',
  '[placeholder]',
].join(',');

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const isUsefulStaticText = (value: string) => {
  const normalized = normalizeText(value);
  if (!normalized || normalized.length < 2 || normalized.length > 180) return false;
  if (/^[\d\s.,:/#()%+-]+$/.test(normalized)) return false;
  return /[A-Za-z\u0400-\u04ff]/.test(normalized);
};

const getTargetText = (element: HTMLElement): EditableTarget | null => {
  for (const attribute of ['placeholder', 'aria-label', 'title'] as const) {
    const value = element.getAttribute(attribute);
    if (value && isUsefulStaticText(value)) {
      return { element, attribute, text: normalizeText(value) };
    }
  }

  const text = normalizeText(element.textContent || '');
  if (!isUsefulStaticText(text)) return null;
  return { element, text };
};

const findEditableTarget = (rawTarget: EventTarget | null): EditableTarget | null => {
  if (!(rawTarget instanceof HTMLElement)) return null;
  if (rawTarget.closest('[data-translation-edit-skip]')) return null;
  if (rawTarget.closest('[data-translation-editor]')) return null;

  const formTarget = rawTarget.closest('input, textarea') as HTMLElement | null;
  if (formTarget) return getTargetText(formTarget);

  const candidate = rawTarget.closest(TEXT_SELECTOR) as HTMLElement | null;
  if (!candidate || candidate === document.body) return null;

  return getTargetText(candidate);
};

const getInitialForm = (text: string, rows: TranslationRow[], language: 'en' | 'uz') => {
  const existing = rows.find((row) => row.id === text || row.english === text || row.uzbek === text);
  if (existing) return existing;

  return {
    id: text,
    english: language === 'en' ? text : '',
    uzbek: language === 'uz' ? text : '',
  };
};

export const TranslationEditMode = ({ isOwner }: { isOwner: boolean }) => {
  const { language, translations, saveTranslation, refreshTranslations } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const [target, setTarget] = useState<EditableTarget | null>(null);
  const [form, setForm] = useState<TranslationRow>({ id: '', english: '', uzbek: '' });
  const [saving, setSaving] = useState(false);

  const targetDescription = useMemo(() => {
    if (!target?.attribute) return 'Visible text';
    return `${target.attribute} text`;
  }, [target]);

  useEffect(() => {
    if (!enabled || !isOwner) return;

    const onClick = (event: MouseEvent) => {
      const editableTarget = findEditableTarget(event.target);
      if (!editableTarget) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setTarget(editableTarget);
      setForm(getInitialForm(editableTarget.text, translations, language));
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled, isOwner, language, translations]);

  useEffect(() => {
    if (!isOwner) {
      setEnabled(false);
      setTarget(null);
    }
  }, [isOwner]);

  if (!isOwner) return null;

  const closeDialog = () => {
    setTarget(null);
    setSaving(false);
  };

  const save = async () => {
    const row = {
      id: form.id.trim(),
      english: form.english.trim(),
      uzbek: form.uzbek.trim(),
    };
    if (!row.id) {
      showToast.error('Translation id is required');
      return;
    }

    setSaving(true);
    try {
      await saveTranslation(row);
      await refreshTranslations();
      if (target) {
        const nextText = language === 'uz' ? row.uzbek || row.english : row.english || row.uzbek;
        if (nextText) {
          if (target.attribute) {
            target.element.setAttribute(target.attribute, nextText);
          } else {
            target.element.textContent = nextText;
          }
        }
      }
      showToast.success('Translation saved');
      closeDialog();
    } catch {
      showToast.error('Could not save translation');
      setSaving(false);
    }
  };

  return (
    <div data-translation-edit-skip data-translation-editor>
      <div className="fixed right-4 top-4 z-[1600] flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={enabled ? 'default' : 'outline'}
          className={cn('gap-2 shadow-lg', enabled && 'bg-amber-500 text-white hover:bg-amber-600')}
          onClick={() => setEnabled((current) => !current)}
        >
          {enabled ? <Check className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
          {enabled ? 'Edit mode on' : 'Edit translations'}
        </Button>
        {enabled && (
          <Button type="button" size="icon" variant="outline" className="h-9 w-9 shadow-lg" onClick={() => setEnabled(false)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {enabled && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[1590] -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          Click a label, button, heading, table header, or placeholder to edit its translation.
        </div>
      )}

      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-xl" data-translation-editor>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Edit translation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Editing: <span className="font-semibold text-foreground">{targetDescription}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="translation-id">ID / key</Label>
              <Input
                id="translation-id"
                value={form.id}
                onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
                placeholder="dashboard.title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="translation-english">English</Label>
              <Textarea
                id="translation-english"
                value={form.english}
                onChange={(event) => setForm((current) => ({ ...current, english: event.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="translation-uzbek">Uzbek</Label>
              <Textarea
                id="translation-uzbek"
                value={form.uzbek}
                onChange={(event) => setForm((current) => ({ ...current, uzbek: event.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save translation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
