import { BookOpen, ClipboardList, KeyRound, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const operationCards = [
  {
    title: 'Imports',
    detail: 'CSV import order: teachers, classes, students, payments.',
    icon: ClipboardList,
  },
  {
    title: 'Access',
    detail: 'RBAC gates pages and feature permissions for superusers and roles.',
    icon: ShieldCheck,
  },
  {
    title: 'Credentials',
    detail: 'Generated student and teacher passwords are hashed before persistence.',
    icon: KeyRound,
  },
  {
    title: 'Academic Core',
    detail: 'Classes bind teachers; students carry teacher and class references for fast reads.',
    icon: BookOpen,
  },
];

const EngineeringOperationsTab = () => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {operationCards.map((item) => {
      const Icon = item.icon;
      return (
        <Card key={item.title}>
          <CardContent className="p-4">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-sm font-bold">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default EngineeringOperationsTab;
