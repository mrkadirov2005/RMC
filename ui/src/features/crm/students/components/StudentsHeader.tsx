import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  onBack?: () => void;
  onAdd: () => void;
}

export const StudentsHeader = ({ title, onBack, onAdd }: Props) => (
  <div className="flex justify-between items-center mb-8">
    <div className="flex items-center gap-3">
      {onBack && (
        <Button variant="outline" onClick={onBack} className="flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      )}
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
    </div>
    <Button onClick={() => onAdd()} className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 px-6 py-3 rounded-lg font-semibold">
      <Plus className="w-5 h-5 mr-2" /> Add Student
    </Button>
  </div>
);

