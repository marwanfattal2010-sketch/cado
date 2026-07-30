import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#000" }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="browse"
        options={{ title: "Browse", tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="gift-finder"
        options={{ title: "Gift Finder", tabBarIcon: ({ color, size }) => <Ionicons name="gift" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="cart"
        options={{ title: "Cart", tabBarIcon: ({ color, size }) => <Ionicons name="cart" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
