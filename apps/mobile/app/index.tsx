import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useFocusEffect } from "expo-router";

const SITE_URL = "https://cado-web.vercel.app";

export default function Home() {
  const webRef = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const [loading, setLoading] = useState(true);

  // Android hardware back button should navigate the site, not close the app.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (canGoBack.current) {
          webRef.current?.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [])
  );

  const onNav = (state: WebViewNavigation) => {
    canGoBack.current = state.canGoBack;
    // Some loads never fire onLoadEnd (redirects, cached responses); clear the
    // overlay as soon as the page reports it is no longer loading.
    if (!state.loading) setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <WebView
        ref={webRef}
        source={{ uri: SITE_URL }}
        onNavigationStateChange={onNav}
        onLoadEnd={() => setLoading(false)}
        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress > 0.7) setLoading(false);
        }}
        onError={() => setLoading(false)}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        style={styles.web}
      />
      {loading ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color="#C9A24B" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F2E9" },
  web: { flex: 1, backgroundColor: "#F7F2E9" },
  loader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F2E9",
  },
});
