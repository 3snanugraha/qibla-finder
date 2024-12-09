import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { appOpenAd, interstitialAd } from "@/services/remoteAds";

export default function RootLayout() {
  const [appOpenAdInstance, setAppOpenAdInstance] = useState<any>(null);
  const [interstitialAdInstance, setInterstitialAdInstance] = useState<any>(null);

  useEffect(() => {
    // Initialize ads
    const initAds = async () => {
      // Setup AppOpen Ad
      const appOpen = appOpenAd();
      if (appOpen) {
        appOpen.load();
        setAppOpenAdInstance(appOpen);
      }

      // Setup Interstitial Ad
      const interstitial = interstitialAd();
      if (interstitial) {
        interstitial.load();
        setInterstitialAdInstance(interstitial);
      }
    };

    initAds();

    // App State Change Handler
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Show AppOpen ad when app comes to foreground
        if (appOpenAdInstance) {
          appOpenAdInstance.show();
        }
      }
    });

    // Cleanup
    return () => {
      subscription.remove();
      if (appOpenAdInstance) {
        appOpenAdInstance.destroy();
      }
      if (interstitialAdInstance) {
        interstitialAdInstance.destroy();
      }
    };
  }, []);

  // Handle Interstitial Ad Events
  useEffect(() => {
    if (!interstitialAdInstance) return;

    const unsubscribeLoaded = interstitialAdInstance.addAdEventListener('loaded', () => {
      console.log('Interstitial ad loaded');
    });

    const unsubscribeClosed = interstitialAdInstance.addAdEventListener('closed', () => {
      // Load the next interstitial
      interstitialAdInstance.load();
    });

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, [interstitialAdInstance]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
