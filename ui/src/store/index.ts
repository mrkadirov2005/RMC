import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../slices/authSlice';
import paymentAccessReducer from '../slices/paymentAccessSlice';
import serviceStatusReducer from '../slices/serviceStatusSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    paymentAccess: paymentAccessReducer,
    serviceStatus: serviceStatusReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
