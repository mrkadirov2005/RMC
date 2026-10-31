import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/client';

// @MOB-126 Show pushes while the app is open too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const projectId = () => (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

// @MOB-126 Asks for permission and sends this device's Expo push token to the backend. Remote
// push needs a real device, a development/store build and an EAS project id; without them this
// quietly does nothing and the in-app inbox still works.
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice || !projectId()) return null;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.HIGH });
    }
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: projectId() })).data;
    await api.request('/devices/current/push-token', { method: 'PUT', body: JSON.stringify({ push_token: token }) });
    return token;
  } catch (error) {
    console.warn('[push] registration skipped:', error);
    return null;
  }
}

const openFrom = (response: Notifications.NotificationResponse | null | undefined) => {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const url = response.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
};

// @MOB-126 Registers once signed in, and opens the screen a tapped push points to.
export function usePushNotifications(signedIn: boolean) {
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (signedIn) void registerForPush();
  }, [signedIn]);

  useEffect(() => {
    if (signedIn) openFrom(lastResponse);
  }, [signedIn, lastResponse]);
}
