import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useProductsByCategory } from "../../src/hooks/useProducts";
import { ProductCard } from "../../src/components/ProductCard";

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const products = useProductsByCategory(slug);

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Stack.Screen options={{ headerShown: true, title: slug }} />
      {products.isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={products.data ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => <ProductCard {...item} images={item.product_images} />}
          ListEmptyComponent={<Text className="mt-8 text-center text-gray-400">No products in this category yet.</Text>}
        />
      )}
    </View>
  );
}
