// Feature-based architecture exports for CRM module

// Hooks
export * from './hooks';

// RBAC
export * from './rbac';

// Feature modules (exported as namespaces to avoid name collisions between barrels)
export * as students from './students';
export * as teachers from './teachers';
export * as classes from './classes';
export * as payments from './payments';
export * as grades from './grades';
export * as attendance from './attendance';
export * as assignments from './assignments';
export * as subjects from './subjects';
export * as centers from './centers';
export * as debts from './debts';
export * as tests from './tests';
export * as dashboard from './dashboard';
