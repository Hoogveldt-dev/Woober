import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useApp } from '../../state/AppContext';
import { kleuren } from '../../theme';

export default function EigenaarTabs() {
  const { boekingen } = useApp();
  const gepland = boekingen.filter((b) => b.mijnRol === 'eigenaar' && (b.status === 'gepland' || b.status === 'aangevraagd')).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: kleuren.primair,
        tabBarInactiveTintColor: '#B4B4BC',
        tabBarStyle: { borderTopColor: kleuren.rand },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Uitlaten', tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color as string} size={size} /> }} />
      <Tabs.Screen name="plekken" options={{ title: 'Plekken', tabBarIcon: ({ color, size }) => <Ionicons name="location" color={color as string} size={size} /> }} />
      <Tabs.Screen
        name="activiteit"
        options={{
          title: 'Activiteit',
          tabBarBadge: gepland > 0 ? gepland : undefined,
          tabBarBadgeStyle: { backgroundColor: kleuren.primair },
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen name="berichten" options={{ title: 'Berichten', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color as string} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color as string} size={size} /> }} />
    </Tabs>
  );
}
