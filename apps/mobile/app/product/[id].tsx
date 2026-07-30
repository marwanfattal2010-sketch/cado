import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useProduct } from "../../src/hooks/useProducts";
import { productImageUrl } from "../../src/lib/images";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/hooks/useAuth";

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id);
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [giftWrap, setGiftWrap] = useState(false);
  const [adding, setAdding] = useState(false);

  if (isLoading || !product) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  const images = product.product_images ?? [];
  const primary = images.find((img) => img.is_primary) ?? images[0];

  const addToCart = async () => {
    if (!session) {
      router.push("/(auth)/login");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("cart_items").insert({
        profile_id: session.user.id,
        product_id: product.id,
        quantity: 1,
        customization: { gift_wrap: giftWrap },
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      router.push("/(tabs)/cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: true, title: product.title }} />
      <View className="h-80 bg-gray-100">
        {primary ? (
          <Image
            source={{ uri: productImageUrl(primary.storage_path) }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : null}
      </View>

      <View className="p-6">
        {product.partner ? <Text className="mb-1 text-sm text-gray-400">{product.partner.name}</Text> : null}
        <Text className="text-2xl font-bold">{product.title}</Text>
        <Text className="mt-1 text-xl text-gray-700">
          {product.currency} {product.price.toFixed(2)}
        </Text>
        {product.description ? <Text className="mt-4 text-gray-600">{product.description}</Text> : null}

        {product.gift_wrap_available ? (
          <TouchableOpacity
            className="mt-6 flex-row items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
            onPress={() => setGiftWrap((v) => !v)}
          >
            <Text>Add gift wrap (+{product.currency} {product.gift_wrap_price.toFixed(2)})</Text>
            <View className={`h-5 w-5 rounded border ${giftWrap ? "border-black bg-black" : "border-gray-300"}`} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          className="mt-6 items-center rounded-xl bg-black py-3"
          onPress={addToCart}
          disabled={adding || product.stock_quantity <= 0}
        >
          <Text className="font-semibold text-white">
            {product.stock_quantity <= 0 ? "Out of stock" : adding ? "Adding..." : "Add to cart"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
