// Source file for the dashboard area in the crm feature.

import { Loader2 } from 'lucide-react';

// Renders the dashboard loading state module.
export const DashboardLoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

