import { FileQuestion, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeacherTestsTabLinkProps {
  navigate: (path: string) => void;
}

export default function TeacherTestsTabLink({ navigate }: TeacherTestsTabLinkProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Tests Management</h3>
        <div className="flex gap-1.5">
          <Button size="sm" className="h-8 rounded-lg bg-cyan-600 text-xs text-white hover:bg-cyan-700" onClick={() => navigate('/tests')}>
            <FileQuestion className="mr-1.5 h-3.5 w-3.5" />
            View All Tests
          </Button>
          <Button size="sm" className="h-8 rounded-lg bg-fuchsia-600 text-xs text-white hover:bg-fuchsia-700" onClick={() => navigate('/tests/create')}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create New Test
          </Button>
        </div>
      </div>
      <Alert className="rounded-lg border-blue-200 bg-blue-50 py-3 text-blue-800">
        <AlertDescription>
          Navigate to the Tests section to create, assign, and manage tests for your classes and students.
        </AlertDescription>
      </Alert>
    </div>
  );
}
