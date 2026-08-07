import { useCallback, useRef } from "react";
import { BackHandler, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useFocusEffect } from "expo-router";

const SITE_URL = "https://cado-web.vercel.app";

export default function Home() {
  const webRef = useRef<WebView>(null);
  const canGoBack = useRef(false);

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
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/*
        No native loading spinner here on purpose: the site's own branded
        splash (apps/web/src/components/Splash.tsx) is the only loading
        state shown, so there's one clean animation instead of a native
        spinner flashing before it.
      */}
      <WebView
        ref={webRef}
        source={{ uri: SITE_URL }}
        onNavigationStateChange={onNav}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        style={styles.web}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#17140F" },
  web: { flex: 1, backgroundColor: "#17140F" },
});
