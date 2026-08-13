// Source file for the students area in the crm feature.

export const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'inactive':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'suspended':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'transferred':
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const isTransferredStudentStatus = (status?: string | null) =>
  String(status || '').trim().toLowerCase() === 'transferred';
