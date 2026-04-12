import { Badge } from '@/components/ui/badge';

interface DashboardHeaderProps {
  firstName?: string;
  role: string;
  loading: boolean;
}

export const DashboardHeader = ({ firstName, role, loading }: DashboardHeaderProps) => {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-sky-600 to-emerald-500 text-white p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {firstName || 'User'}!</h1>
          <p className="text-white/90 mt-1">Here is a live snapshot of your CRM activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/20 text-white border-none hover:bg-white/30">
            {role.toUpperCase()}
          </Badge>
          <Badge className="bg-white/10 text-white border-none hover:bg-white/20">
            {loading ? 'Updating...' : 'Updated'}
          </Badge>
        </div>
      </div>
    </div>
  );
};

