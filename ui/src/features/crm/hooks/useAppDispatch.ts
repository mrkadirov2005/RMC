// React hooks for the crm feature.

import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store';

// Provides app dispatch.
export const useAppDispatch = () => useDispatch<AppDispatch>();
