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
      return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const isTransferredStudentStatus = (status?: string | null) =>
  String(status || '').trim().toLowerCase() === 'transferred';

/** True once a student has been transferred OUT of a class: their row stays in that class's
 * roster (status='Transferred') so the departure is visible - render it red/"left" toned. */
export const isOutgoingTransfer = isTransferredStudentStatus;

/** True for a student's row in the class they just arrived in via a transfer: still active,
 * but `previous_class_id` points back at where they came from - render it green/"new" toned. */
export const isIncomingTransfer = (student?: { status?: string | null; previous_class_id?: number | null } | null) =>
  Boolean(student?.previous_class_id) && !isTransferredStudentStatus(student?.status);

export const INCOMING_TRANSFER_VARIANT =
  'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700';
