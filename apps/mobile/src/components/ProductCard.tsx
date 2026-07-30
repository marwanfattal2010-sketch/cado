import { Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { primaryImage } from "../lib/images";

type ProductCardProps = {
  id: string;
  title: string;
  price: number;
  currency: string;
  images?: { storage_path: string; is_primary: boolean }[] | null;
};

export function ProductCard({ id, title, price, currency, images }: ProductCardProps) {
  const uri = primaryImage(images);

  return (
    <Link href={{ pathname: "/product/[id]", params: { id } }} asChild>
      <TouchableOpacity className="mr-3 w-40">
        <View className="h-40 w-40 overflow-hidden rounded-2xl bg-gray-100">
          {uri ? (
            <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-gray-300">No image</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={1} className="mt-2 font-medium">
          {title}
        </Text>
        <Text className="text-gray-500">
          {currency} {price.toFixed(2)}
        </Text>
      </TouchableOpacity>
    </Link>
  );
}
