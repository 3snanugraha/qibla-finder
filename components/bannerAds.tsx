import { View, StyleSheet } from 'react-native';
import { BannerAdComponent } from '@/services/remoteAds';

export default function BannerAds() {
  return (
    <View style={styles.adContainer}>
      <BannerAdComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  adContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
    minHeight: 50, // Add minimum height for banner
  }
});
