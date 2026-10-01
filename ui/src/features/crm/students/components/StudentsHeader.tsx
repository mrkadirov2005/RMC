// Source file for the students area in the crm feature.

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  title: string;
  onBack?: () => void;
}

// Renders the students header module.
export const StudentsHeader = ({ title, onBack }: Props) => {
  const { t } = useLanguage();
  return (
  <div className="flex items-center gap-3">
    {onBack && (
      <Button variant="outline" onClick={onBack} className="flex items-center gap-1.5">
        <ArrowLeft className="h-4 w-4" /> {t('Back')}
      </Button>
    )}
    <h1 className="text-3xl font-bold text-foreground">{title}</h1>
  </div>
);
};

