import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { useCategories } from "../../src/hooks/useCategories";
import { useFeaturedProducts, useTrendingProducts, useUpcomingOccasionEvents } from "../../src/hooks/useProducts";
import { ProductCard } from "../../src/components/ProductCard";

export default function Home() {
  const categories = useCategories();
  const trending = useTrendingProducts();
  const featured = useFeaturedProducts();
  const occasions = useUpcomingOccasionEvents();

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="px-6 pt-16">
        <Text className="text-2xl font-bold">CADO</Text>
        <Text className="text-gray-500">Gifts, delivered.</Text>
      </View>

      {occasions.data && occasions.data.length > 0 ? (
        <View className="mt-6 px-6">
          <Text className="mb-2 text-lg font-semibold">Upcoming occasions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {occasions.data.map((event) => (
              <View key={event.id} className="mr-3 w-48 rounded-2xl bg-gray-100 p-4">
                <Text className="font-medium">{event.title}</Text>
                <Text className="mt-1 text-sm text-gray-500">{event.event_date}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View className="mt-6 px-6">
        <Text className="mb-2 text-lg font-semibold">Categories</Text>
        {categories.isLoading ? (
          <ActivityIndicator />
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {categories.data?.map((cat) => (
              <Link key={cat.id} href={{ pathname: "/category/[slug]", params: { slug: cat.slug } }} asChild>
                <TouchableOpacity className="rounded-full bg-gray-100 px-4 py-2">
                  <Text className="text-sm font-medium">{cat.name}</Text>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        )}
      </View>

      <View className="mt-6 px-6">
        <Text className="mb-2 text-lg font-semibold">Trending gifts</Text>
        {trending.isLoading ? (
          <ActivityIndicator />
        ) : trending.data && trending.data.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {trending.data.map((p) => (
              <ProductCard key={p.id} {...p} images={p.product_images} />
            ))}
          </ScrollView>
        ) : (
          <Text className="text-gray-400">No trending gifts yet.</Text>
        )}
      </View>

      <View className="mt-6 px-6">
        <Text className="mb-2 text-lg font-semibold">Recommended for you</Text>
        {featured.isLoading ? (
          <ActivityIndicator />
        ) : featured.data && featured.data.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featured.data.map((p) => (
              <ProductCard key={p.id} {...p} images={p.product_images} />
            ))}
          </ScrollView>
        ) : (
          <Text className="text-gray-400">No featured gifts yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}
