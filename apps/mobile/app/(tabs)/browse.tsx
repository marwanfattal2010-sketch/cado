import { useState } from "react";
import { ActivityIndicator, FlatList, Text, TextInput, View } from "react-native";
import { useCategories } from "../../src/hooks/useCategories";
import { useSearchProducts } from "../../src/hooks/useProducts";
import { ProductCard } from "../../src/components/ProductCard";
import { Link } from "expo-router";

export default function Browse() {
  const [query, setQuery] = useState("");
  const categories = useCategories();
  const search = useSearchProducts(query);

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="mb-4 text-2xl font-bold">Browse</Text>

      <TextInput
        className="mb-4 rounded-xl border border-gray-200 px-4 py-3"
        placeholder="Search for gifts..."
        value={query}
        onChangeText={setQuery}
      />

      {query.trim().length > 1 ? (
        search.isLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={search.data ?? []}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => <ProductCard {...item} images={item.product_images} />}
            ListEmptyComponent={<Text className="mt-8 text-center text-gray-400">No results for "{query}"</Text>}
          />
        )
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {categories.data?.map((cat) => (
            <Link key={cat.id} href={{ pathname: "/category/[slug]", params: { slug: cat.slug } }} asChild>
              <View className="rounded-full bg-gray-100 px-4 py-2">
                <Text className="text-sm font-medium">{cat.name}</Text>
              </View>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}
