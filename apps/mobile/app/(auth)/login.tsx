import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-1 text-3xl font-bold">CADO</Text>
      <Text className="mb-8 text-gray-500">Gifts, delivered.</Text>

      <TextInput
        className="mb-3 rounded-xl border border-gray-200 px-4 py-3"
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="mb-2 rounded-xl border border-gray-200 px-4 py-3"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text className="mb-2 text-red-500">{error}</Text> : null}

      <TouchableOpacity
        className="mt-4 items-center rounded-xl bg-black py-3"
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Log in</Text>}
      </TouchableOpacity>

      <Link href="/(auth)/signup" asChild>
        <TouchableOpacity className="mt-4 items-center">
          <Text className="text-gray-500">
            Don&apos;t have an account? <Text className="font-semibold text-black">Sign up</Text>
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
