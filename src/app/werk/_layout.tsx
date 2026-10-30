import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useApp } from '../../state/AppContext';
import { kleuren } from '../../theme';

export default function UitlaterTabs() {
  const { boekingen } = useApp();
  const gepland = boekingen.filter((b) => b.mijnRol === 'uitlater' && b.status === 'gepland').length;

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
      <Tabs.Screen name="index" options={{ title: 'Werk', tabBarIcon: ({ color, size }) => <Ionicons name="navigate" color={color as string} size={size} /> }} />
      <Tabs.Screen
        name="opdrachten"
        options={{
          title: 'Opdrachten',
          tabBarBadge: gepland > 0 ? gepland : undefined,
          tabBarBadgeStyle: { backgroundColor: kleuren.primair },
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color as string} size={size} />,
        }}
      />
      {/* Woober Fit: stappen en koppelingen met fitness-apps. Verdiensten staan onder Account. */}
      <Tabs.Screen name="fit" options={{ title: 'Fit', tabBarIcon: ({ color, size }) => <Ionicons name="footsteps" color={color as string} size={size} /> }} />
      <Tabs.Screen name="berichten" options={{ title: 'Berichten', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color as string} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color as string} size={size} /> }} />
    </Tabs>
  );
}
