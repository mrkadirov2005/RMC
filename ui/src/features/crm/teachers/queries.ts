// Query helpers for the crm feature.

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'inactive':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'on leave':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Returns initials.
export const getInitials = (firstName: string, lastName: string) =>
  `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();

