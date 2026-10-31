import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { Loading } from '../components/ui';

// @MOB-104 Sends each role to its own tabs.
export default function Index() {
  const { status, user } = useAuth();
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Loading />
      </View>
    );
  }
  if (status === 'signedOut' || !user) return <Redirect href="/login" />;
  return <Redirect href={user.role === 'parent' ? '/parent' : '/student'} />;
}
