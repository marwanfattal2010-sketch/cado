import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Image, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useFocusEffect } from "expo-router";

const SITE_URL = "https://cado-web.vercel.app";

/**
 * THE LAUNCH SCREEN, AND WHY IT IS SPLIT IN TWO
 *
 * Android 12 and up will not render a full-bleed image as the system splash.
 * It is locked to a centred icon on a single flat colour, so the tiled icon
 * pattern is simply not possible there — the system would throw the pattern
 * away and show the wordmark on flat persimmon.
 *
 * So the launch is two screens that are built to look like one:
 *
 *   1. the SYSTEM splash — flat persimmon, cream CADO wordmark, configured in
 *      app.json. Plain on purpose, because plain is all Android allows.
 *   2. this IN-APP screen — the same persimmon, the same wordmark at exactly
 *      the same size and position, with the pattern behind it.
 *
 * Because the wordmark image and its size (200dp) are identical in both, the
 * handover is invisible: the pattern appears behind a wordmark that has not
 * moved.
 *
 * IT MUST STAY UNDER A SECOND. An earlier in-app splash ran 4.8 seconds and
 * was reported as a bug, correctly. This one is capped: it goes as soon as the
 * site has painted, waits at least 400ms so it cannot flicker, and is forced
 * away at 700ms whatever the network is doing. Worst case, fade included, is
 * 900ms — and it is never dead time, because the site is loading behind it.
 */
/*
 * WHY THESE ARE LONGER THAN THEY LOOK LIKE THEY SHOULD BE
 *
 * The first version held for 400-700ms, which is correct if the only job is
 * to cover a load. It is wrong here, because this screen also has to be SEEN:
 * the system splash before it is flat persimmon with the same wordmark at the
 * same size, so a pattern that appears for half a second behind an unmoving
 * logo reads as nothing having happened at all. Marwan installed it twice and
 * reported no pattern; the pattern was there both times.
 *
 * 1.6s is long enough to register and read, and still nowhere near the 4.8s
 * version that was reported as a bug. The site keeps loading behind it, so
 * this is not dead time.
 */
const SPLASH_MIN_MS = 1600;
const SPLASH_MAX_MS = 2000;
const SPLASH_FADE_MS = 260;

/** Persimmon. The same value as the system splash in app.json. */
const PERSIMMON = "#F94E33";

export default function Home() {
  const webRef = useRef<WebView>(null);
  const canGoBack = useRef(false);

  const [splashVisible, setSplashVisible] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;
  const siteReady = useRef(false);
  const minElapsed = useRef(false);
  const gone = useRef(false);

  const hideSplash = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    Animated.timing(fade, {
      toValue: 0,
      duration: SPLASH_FADE_MS,
      useNativeDriver: true,
    }).start(() => setSplashVisible(false));
  }, [fade]);

  useEffect(() => {
    const floor = setTimeout(() => {
      minElapsed.current = true;
      if (siteReady.current) hideSplash();
    }, SPLASH_MIN_MS);
    const ceiling = setTimeout(hideSplash, SPLASH_MAX_MS);
    return () => {
      clearTimeout(floor);
      clearTimeout(ceiling);
    };
  }, [hideSplash]);

  const onLoadEnd = useCallback(() => {
    siteReady.current = true;
    if (minElapsed.current) hideSplash();
  }, [hideSplash]);

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
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/*
          No native loading spinner here on purpose: the launch screen above is
          the only loading state, so there is one clean handover instead of a
          native spinner flashing over it.
        */}
        <WebView
          ref={webRef}
          source={{ uri: SITE_URL }}
          onNavigationStateChange={onNav}
          onLoadEnd={onLoadEnd}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
          style={styles.web}
        />
      </SafeAreaView>

      {splashVisible ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.splash, { opacity: fade }]}>
          {/*
            "cover" crops, it never stretches — so the icons keep their shape on
            a 16:9 phone and a 20:9 one alike, and only the edges of the pattern
            are trimmed. The artwork is cut at 19.5:9 so that trim stays small,
            and the cleared middle stays centred whichever way it is cropped.
          */}
          <Image source={require("../assets/splash-pattern.png")} style={styles.pattern} resizeMode="cover" />
          {/*
            200dp, contain — identical to `imageWidth: 200` on the system splash
            in app.json, which is what makes the handover invisible. Change one
            and you must change the other.
          */}
          <Image source={require("../assets/splash-wordmark.png")} style={styles.wordmark} resizeMode="contain" />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Persimmon rather than the old near-black: this is what shows through
  // behind the WebView before the site paints, and behind an overscroll.
  // Black there read as the app having crashed between the two splashes.
  root: { flex: 1, backgroundColor: PERSIMMON },
  safe: { flex: 1, backgroundColor: PERSIMMON },
  web: { flex: 1, backgroundColor: PERSIMMON },
  splash: { backgroundColor: PERSIMMON, alignItems: "center", justifyContent: "center" },
  // The 100% is not redundant with absoluteFill. Left to itself an Image falls
  // back to the picture's own 1242x2688, and the pattern comes out about three
  // times too big with two icons across the screen instead of six. Percentages
  // resolve against the parent everywhere, so this is unambiguous.
  pattern: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  wordmark: { width: 200, height: 200 },
});
