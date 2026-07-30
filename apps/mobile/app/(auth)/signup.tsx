import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";

export default function Signup() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, fullName.trim());
      setConfirmSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign up");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmSent) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-lg font-semibold">Check your email</Text>
        <Text className="mt-2 text-center text-gray-500">
          We sent a confirmation link to {email}. Confirm it, then log in.
        </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity className="mt-6 items-center rounded-xl bg-black px-6 py-3">
            <Text className="font-semibold text-white">Back to login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-1 text-3xl font-bold">Create account</Text>
      <Text className="mb-8 text-gray-500">Find the perfect gift, every time.</Text>

      <TextInput
        className="mb-3 rounded-xl border border-gray-200 px-4 py-3"
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
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
        {submitting ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Sign up</Text>}
      </TouchableOpacity>

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity className="mt-4 items-center">
          <Text className="text-gray-500">
            Already have an account? <Text className="font-semibold text-black">Log in</Text>
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
