import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Map, Settings, Truck, Database, Factory, MessageSquare, Radio, Cpu } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF8C00',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.08)',
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          height: 74,
          paddingBottom: 14,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="supplier"
        options={{
          title: 'Supplier',
          tabBarIcon: ({ color, size }) => <Factory color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="production"
        options={{
          title: 'Production',
          tabBarIcon: ({ color, size }) => <Cpu color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="logistics"
        options={{
          title: 'Logistics',
          tabBarIcon: ({ color, size }) => <Truck color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="warehouse"
        options={{
          title: 'Warehouse',
          tabBarIcon: ({ color, size }) => <Database color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'War Room',
          tabBarIcon: ({ color, size }) => <Radio color={color} size={size - 2} />,
        }}
      />

      {/* Hidden tabs */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
