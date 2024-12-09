import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { appOpenAd, interstitialAd } from "@/services/remoteAds";
import { AdEventType } from 'react-native-google-mobile-ads';

export default function RootLayout() {
  const [appOpenAdInstance, setAppOpenAdInstance] = useState<any>(null);
  const [interstitialAdInstance, setInterstitialAdInstance] = useState<any>(null);
  const [isAppOpenAdLoaded, setIsAppOpenAdLoaded] = useState(false);
  const [isInterstitialAdLoaded, setIsInterstitialAdLoaded] = useState(false);

  useEffect(() => {
    let appOpenUnsubscribeLoaded: (() => void) | null = null;
    let appOpenUnsubscribeClosed: (() => void) | null = null;
    let interstitialUnsubscribeLoaded: (() => void) | null = null;
    let interstitialUnsubscribeClosed: (() => void) | null = null;

    const initAds = async () => {
      // Setup AppOpen Ad
      const appOpen = appOpenAd();
      if (appOpen) {
        appOpenUnsubscribeLoaded = appOpen.addAdEventListener(AdEventType.LOADED, () => {
          setIsAppOpenAdLoaded(true);
        });
        
        appOpenUnsubscribeClosed = appOpen.addAdEventListener(AdEventType.CLOSED, () => {
          setIsAppOpenAdLoaded(false);
          appOpen.load();
        });

        appOpen.load();
        setAppOpenAdInstance(appOpen);
      }

      // Setup Interstitial Ad
      const interstitial = interstitialAd();
      if (interstitial) {
        interstitialUnsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
          setIsInterstitialAdLoaded(true);
        });

        interstitialUnsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
          setIsInterstitialAdLoaded(false);
          interstitial.load();
        });

        interstitial.load();
        setInterstitialAdInstance(interstitial);
      }
    };

    initAds();

    // App State Change Handler for AppOpen Ad
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAppOpenAdLoaded) {
        await appOpenAdInstance?.show();
      }
    });

    // Show Interstitial Ad after a delay
    const interstitialTimer = setTimeout(() => {
      if (isInterstitialAdLoaded) {
        interstitialAdInstance?.show();
      }
    }, 5000);

    return () => {
      subscription.remove();
      clearTimeout(interstitialTimer);
      appOpenUnsubscribeLoaded?.();
      appOpenUnsubscribeClosed?.();
      interstitialUnsubscribeLoaded?.();
      interstitialUnsubscribeClosed?.();
    };
  }, [isAppOpenAdLoaded, isInterstitialAdLoaded]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
