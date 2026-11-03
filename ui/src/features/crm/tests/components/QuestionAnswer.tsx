// The answer area of one question while taking a test: big buttons for a choice or true/false
// (easy to tap on a phone), a box for written answers with its word count, pairs for matching.

import { Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { countWords } from '../answerFormat';

interface QuestionAnswerProps {
  question: any;
  value: any;
  onChange: (value: any) => void;
}

const choiceClass = (selected: boolean) =>
  cn(
    'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base transition-colors',
    selected ? 'border-primary bg-primary/10 font-semibold' : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
  );

export const QuestionAnswer = ({ question, value, onChange }: QuestionAnswerProps) => {
  const { t } = useLanguage();
  const type = question.question_type;

  if (type === 'multiple_choice') {
    return (
      <div className="space-y-2.5" role="radiogroup">
        {(question.options || []).map((option: string, index: number) => {
          const selected = value?.index === index;
          return (
            <button key={index} type="button" role="radio" aria-checked={selected} onClick={() => onChange({ index })} className={choiceClass(selected)}>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (type === 'true_false') {
    return (
      <div className="grid grid-cols-2 gap-3" role="radiogroup">
        {[
          { value: true, label: t('True'), icon: Check },
          { value: false, label: t('False'), icon: X },
        ].map((option) => {
          const selected = value?.value === option.value;
          const Icon = option.icon;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ value: option.value })}
              className={cn(choiceClass(selected), 'justify-center py-5 text-lg')}
            >
              <Icon className="h-5 w-5" />
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === 'short_answer') {
    return <Input className="h-12 text-base" placeholder={t('Type your answer here...')} value={value?.text || ''} onChange={(event) => onChange({ text: event.target.value })} />;
  }

  if (type === 'essay' || type === 'writing') {
    const words = countWords(value?.text);
    const limit = Number(question.word_limit) || 0;
    return (
      <div>
        <Textarea rows={10} className="text-base" placeholder={t('Write your answer here...')} value={value?.text || ''} onChange={(event) => onChange({ text: event.target.value })} />
        <p className={cn('mt-1 text-sm', limit > 0 && words > limit ? 'text-rose-600' : limit > 0 && words >= limit * 0.9 ? 'text-amber-600' : 'text-muted-foreground')}>
          {limit > 0 ? t('{count} / {limit} words', { count: words, limit }) : t('{count} words', { count: words })}
        </p>
      </div>
    );
  }

  if (type === 'matching' && question.matching_pairs) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{t('Match each item on the left with one on the right.')}</p>
        {question.matching_pairs.map((pair: any, index: number) => (
          <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1 rounded-lg bg-muted p-3">{pair.left}</div>
            <select
              value={value?.matches?.[index] ?? ''}
              onChange={(event) => onChange({ matches: { ...(value?.matches || {}), [index]: event.target.value } })}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm sm:min-w-[220px]"
            >
              <option value="">{t('Choose...')}</option>
              {question.matching_pairs.map((item: any, itemIndex: number) => (
                <option key={itemIndex} value={item.right}>
                  {item.right}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  // Gap filling, an answer about a reading text, and any other written answer.
  return (
    <Textarea
      rows={type === 'form_filling' ? 3 : 5}
      className="text-base"
      placeholder={t('Type your answer here...')}
      value={value?.text || ''}
      onChange={(event) => onChange({ text: event.target.value })}
    />
  );
};
