import Constants from 'expo-constants';

// @MOB-100 API base URL: EXPO_PUBLIC_API_URL wins, then app.json extra.apiUrl.
const configured = process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;

export const API_URL = String(configured || 'http://localhost:4000').replace(/\/+$/, '');
export const MOBILE_API = `${API_URL}/api/mobile/v1`;
export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
