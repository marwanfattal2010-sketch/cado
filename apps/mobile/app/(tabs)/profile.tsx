import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../src/hooks/useAuth";

export default function Profile() {
  const { profile, session, signOut } = useAuth();

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-2xl font-semibold">{profile?.full_name || "Profile"}</Text>
      <Text className="mt-1 text-gray-500">{session?.user.email}</Text>

      <View className="mt-8 gap-4">
        <Text className="text-gray-400">Orders, Favorites, Addresses, and Reminders land in later stages.</Text>
      </View>

      <TouchableOpacity className="mt-auto mb-10 items-center rounded-xl bg-gray-100 py-3" onPress={signOut}>
        <Text className="font-semibold text-black">Log out</Text>
      </TouchableOpacity>
    </View>
  );
}
