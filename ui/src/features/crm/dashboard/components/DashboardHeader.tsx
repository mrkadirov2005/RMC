// Source file for the dashboard area in the crm feature.

import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/PageHeader';
import { LayoutDashboard } from 'lucide-react';
import { useLanguage } from '../../../../i18n/LanguageContext';

interface DashboardHeaderProps {
  firstName?: string;
  role: string;
  loading: boolean;
}

// Renders the dashboard header module.
export const DashboardHeader = ({ firstName, role, loading }: DashboardHeaderProps) => {
  const { t } = useLanguage();

  return (
    <PageHeader
      className="animate-slide-up"
      variant="hero"
      title={`${t('Welcome')}, ${firstName || t('User')}!`}
      description={t('Student, school, and finance analytics in one place.')}
      icon={LayoutDashboard}
      meta={
        <>
          <Badge className="bg-white/20 text-white border-none hover:bg-white/30">{role.toUpperCase()}</Badge>
          <Badge className="bg-white/10 text-white border-none hover:bg-white/20">{loading ? t('Updating...') : t('Updated')}</Badge>
        </>
      }
    />
  );
};
