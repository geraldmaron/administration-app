import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { Newsreader_400Regular, Newsreader_400Regular_Italic, Newsreader_500Medium, Newsreader_600SemiBold } from "@expo-google-fonts/newsreader";
import { configureLinkBase, View } from "@admin/ui";
import { configureMapWorker } from "@admin/ui/map";
import { DeviceProviders } from "../src/device/DeviceProviders";
import { AuthorityProvider } from "../src/law/AuthorityProvider";
import { AppTheme } from "../src/theme/AppTheme";

// A web export hosted under a subpath (GitHub Pages serves it at /<repo>/)
// prints that prefix in every anchor and serves the MapLibre worker under it.
const webBase = process.env.EXPO_BASE_URL ?? "";
configureLinkBase(webBase);
configureMapWorker(`${webBase}/maplibre/maplibre-gl-worker.mjs`);

SplashScreen.preventAutoHideAsync().catch((cause: unknown) => console.warn("The splash screen could not be held; the first frame may show before fonts load.", cause));

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
  });
  const ready = fontsLoaded || fontError !== null;
  useEffect(() => {
    if (fontError) console.warn("The Geist and Newsreader faces could not load; the system face stands in.", fontError);
    if (ready) SplashScreen.hideAsync().catch((cause: unknown) => console.warn("The splash screen could not be released.", cause));
  }, [ready, fontError]);
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DeviceProviders>
          <AppTheme>
            <AuthorityProvider>
              <View flex={1} backgroundColor="backgroundStrong">
                <StatusBar style="light" />
                <Slot />
              </View>
            </AuthorityProvider>
          </AppTheme>
        </DeviceProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
