// Source file for the selectors.ts area in the owner feature.

import type { RootState } from '../../store';

// Selects owner manager ui.
export const selectOwnerManagerUi = (state: RootState) => state.pagesUi.ownerManager;
