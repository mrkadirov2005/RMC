import { useState } from 'react';
import { AlertTriangle, Boxes, Database, Network, ScrollText, Server, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import ServerMonitorPage from './ServerMonitorPage';
import EngineeringDatabaseTab from './tabs/EngineeringDatabaseTab';
import EngineeringLoggingTab from './tabs/EngineeringLoggingTab';
import EngineeringOperationsTab from './tabs/EngineeringOperationsTab';
import EngineeringRequestHealthTab from './tabs/EngineeringRequestHealthTab';

type EngineeringTab = 'server' | 'database' | 'warnings' | 'failed' | 'logging' | 'operations';

const tabs: Array<{ id: EngineeringTab; label: string; icon: typeof Server }> = [
  { id: 'server', label: 'Server', icon: Server },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'warnings', label: 'Warnings', icon: AlertTriangle },
  { id: 'failed', label: 'Failed Requests', icon: ShieldAlert },
  { id: 'logging', label: 'Logging', icon: ScrollText },
  { id: 'operations', label: 'Operations', icon: Boxes },
];

const EngineeringPage = () => {
  const [activeTab, setActiveTab] = useState<EngineeringTab>('server');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Engineering"
        description="Operational command center for server health, database structure, logging, and platform internals."
        icon={Network}
      />

      <div className="flex gap-2 overflow-x-auto rounded-lg border bg-card p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                active ? 'bg-slate-950 text-white shadow-sm dark:bg-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'server' && <ServerMonitorPage />}
      {activeTab === 'database' && <EngineeringDatabaseTab />}
      {activeTab === 'warnings' && <EngineeringRequestHealthTab mode="warnings" />}
      {activeTab === 'failed' && <EngineeringRequestHealthTab mode="failed" />}
      {activeTab === 'logging' && <EngineeringLoggingTab />}
      {activeTab === 'operations' && <EngineeringOperationsTab />}
    </div>
  );
};

export default EngineeringPage;
