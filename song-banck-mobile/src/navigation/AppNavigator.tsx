import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { DrawerParamList, EventsStackParamList, SongsStackParamList } from './types';
import { SongsScreen } from '../screens/SongsScreen';
import { SongDetailScreen } from '../screens/SongDetailScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { colors } from '../theme/colors';

type AppNavigatorProps = {
  token: string;
  onLogout: () => void;
};

const SongsStack = createNativeStackNavigator<SongsStackParamList>();
const EventsStack = createNativeStackNavigator<EventsStackParamList>();
const Tabs = createBottomTabNavigator<DrawerParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
  headerTitleStyle: { fontWeight: '700' as const, color: colors.text },
};

function SongsStackNavigator({ token, onLogout }: AppNavigatorProps) {
  return (
    <SongsStack.Navigator screenOptions={stackScreenOptions}>
      <SongsStack.Screen name="Songs" options={{ headerShown: false }}>
        {({ navigation }) => (
          <SongsScreen
            token={token}
            onLogout={onLogout}
            onOpenSong={(songId) => navigation.navigate('SongDetail', { songId })}
          />
        )}
      </SongsStack.Screen>
      <SongsStack.Screen name="SongDetail" options={{ title: 'Alabanza' }}>
        {({ route }) => <SongDetailScreen token={token} songId={route.params.songId} />}
      </SongsStack.Screen>
    </SongsStack.Navigator>
  );
}

function EventsStackNavigator({ token, onLogout }: AppNavigatorProps) {
  return (
    <EventsStack.Navigator screenOptions={stackScreenOptions}>
      <EventsStack.Screen name="Events" options={{ headerShown: false }}>
        {({ navigation }) => (
          <EventsScreen
            token={token}
            onLogout={onLogout}
            onOpenEvent={(eventId, eventName) =>
              navigation.navigate('EventDetail', { eventId, eventName })
            }
          />
        )}
      </EventsStack.Screen>
      <EventsStack.Screen
        name="EventDetail"
        options={({ route }) => ({ title: route.params.eventName })}
      >
        {({ route }) => <EventDetailScreen token={token} eventId={route.params.eventId} />}
      </EventsStack.Screen>
    </EventsStack.Navigator>
  );
}

export function AppNavigator({ token, onLogout }: AppNavigatorProps) {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, focused }) => {
          const icon = route.name === 'SongsStack' ? '🎵' : '📅';
          return (
            <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>
              {icon}
            </Text>
          );
        },
      })}
    >
      <Tabs.Screen name="SongsStack" options={{ title: 'Alabanzas' }}>
        {() => <SongsStackNavigator token={token} onLogout={onLogout} />}
      </Tabs.Screen>
      <Tabs.Screen name="EventsStack" options={{ title: 'Eventos' }}>
        {() => <EventsStackNavigator token={token} onLogout={onLogout} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}
