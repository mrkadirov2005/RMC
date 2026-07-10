import { Activity, FileText, ScrollText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const loggingCards = [
  {
    title: 'Request Logs',
    detail: 'Operational request history lives in the dedicated logs page.',
    meta: 'Route: /logs',
    icon: ScrollText,
  },
  {
    title: 'Audit Logs',
    detail: 'The database stores actor, action, entity, entity id, metadata, and timestamp.',
    meta: 'Table: audit_logs',
    icon: FileText,
  },
  {
    title: 'Runtime Events',
    detail: 'The server tab samples health, database latency, CPU, memory, and heap pressure.',
    meta: 'Endpoint: /api/health/stats',
    icon: Activity,
  },
];

const EngineeringLoggingTab = () => (
  <div className="grid gap-4 lg:grid-cols-3">
    {loggingCards.map((item) => {
      const Icon = item.icon;
      return (
        <Card key={item.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4 text-primary" />
              {item.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{item.detail}</p>
            <p className="font-medium text-foreground">{item.meta}</p>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default EngineeringLoggingTab;
