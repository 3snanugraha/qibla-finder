import { Platform } from 'react-native';
import { TestIds, InterstitialAd, AppOpenAd, BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

const GIST_URL = 'https://gist.githubusercontent.com/3snanugraha/e4627fc2e6b224921dbaf87d1bc3c0fb/raw';

interface AdUnit {
  enabled: string;
  unitId: string;
}

interface PlatformAdUnits {
  banner: AdUnit;
  interstitial: AdUnit;
  appOpen: AdUnit;
}

interface AdConfig {
  enabled: boolean;
  testMode: boolean;
  adUnits: {
    ios: PlatformAdUnits;
    android: PlatformAdUnits;
  };
}

export const fetchAdConfig = async () => {
  try {
    const response = await fetch(GIST_URL);
    const data = await response.json();
    return data.ads as AdConfig;
  } catch (error) {
    console.error('Error fetching ad config:', error);
    return null;
  }
};

export const initializeAds = async () => {
  const adConfig = await fetchAdConfig();
  if (!adConfig || !adConfig.enabled) {
    console.log('Ads are disabled');
    return null;
  }

  const platform = Platform.OS as 'ios' | 'android';
  const testMode = adConfig.testMode;
  const adUnits = adConfig.adUnits[platform];

  // Periksa jika unit ads diaktifkan
  const adIds = {
    banner: adUnits.banner.enabled === "true" 
      ? (testMode ? TestIds.BANNER : adUnits.banner.unitId)
      : null,
    interstitial: adUnits.interstitial.enabled === "true"
      ? (testMode ? TestIds.INTERSTITIAL : adUnits.interstitial.unitId)
      : null,
    appOpen: adUnits.appOpen.enabled === "true"
      ? (testMode ? TestIds.APP_OPEN : adUnits.appOpen.unitId)
      : null,
  };

  return adIds;
};

let adIds: {
  banner: string | null;
  interstitial: string | null;
  appOpen: string | null;
} | null = null;

export const setupAds = async () => {
  adIds = await initializeAds();
  if (!adIds) {
    console.log('Ad initialization failed or ads are disabled.');
    return;
  }
  console.log('Ads initialized with IDs:', adIds);
};

export const interstitialAd = () => {
  if (!adIds?.interstitial) return null;
  return InterstitialAd.createForAdRequest(adIds.interstitial, {
    keywords: ['halal', 'islamic'],
    requestNonPersonalizedAdsOnly: true,
  });
};

export const appOpenAd = () => {
  if (!adIds?.appOpen) return null;
  return AppOpenAd.createForAdRequest(adIds.appOpen, {
    keywords: ['halal', 'islamic'],
    requestNonPersonalizedAdsOnly: true,
  });
};

export const BannerAdComponent = () => {
  if (!adIds?.banner) return null;

  return (
    <BannerAd
      unitId={adIds.banner}
      size={BannerAdSize.BANNER}
      requestOptions={{
        keywords: ['halal', 'islamic'],
        requestNonPersonalizedAdsOnly: true,
      }}
      onAdFailedToLoad={(error) => {
        console.error('Banner ad failed to load:', error);
      }}
    />
  );
};

// Cleanup function
export const cleanupAds = () => {
  adIds = null;
};

// Initialize ads
setupAds();
