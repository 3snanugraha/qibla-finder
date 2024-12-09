import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Dimensions, Image, ScrollView } from 'react-native';
import { Magnetometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BannerAds from '@/components/bannerAds';
import { Audio } from 'expo-av';


export default function QiblaCompass() {
  const [magnetometer, setMagnetometer] = useState(0);
  const [gyroscope, setGyroscope] = useState({ x: 0, y: 0, z: 0 });
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFlat, setIsFlat] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const lastPlayTime = useRef(0);
  // Kaaba coordinates
  const KAABA_LAT = 21.422487;
  const KAABA_LNG = 39.826206;

  useEffect(() => {
    let magSubscription: { remove: () => void; };
    let gyroSubscription: { remove: () => void; };

    (async () => {
      try {
        // Request permissions
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        // Get current location
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        setLocation(currentLocation);

        // Calculate Qibla direction
        if (currentLocation) {
          const qibla = calculateQiblaDirection(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude
          );
          setQiblaDirection(qibla);
        }

        // Start magnetometer updates with higher frequency
        Magnetometer.setUpdateInterval(100);
        magSubscription = Magnetometer.addListener(data => {
          let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
          angle = (angle < 0) ? angle + 360 : angle;
          setMagnetometer(angle);
          
          // Check accuracy and play sound here instead of in getQiblaAngle
          const qiblaAngle = ((qiblaDirection - angle + 360) % 360);
          if (Math.abs(qiblaAngle - 180) <= 5) {
            playAccurateSound();
          }
        });

        // Start gyroscope updates
        Gyroscope.setUpdateInterval(100);
        gyroSubscription = Gyroscope.addListener(data => {
          setGyroscope(data);
          // Check if device is relatively flat
          setIsFlat(Math.abs(data.x) < 0.1 && Math.abs(data.y) < 0.1);
        });

      } catch (error) {
        setErrorMsg('Error initializing sensors');
      }
    })();

    return () => {
      magSubscription?.remove();
      gyroSubscription?.remove();
    };
  }, []);

  // Load sound when component mounts
  useEffect(() => {
    async function loadSound() {
      try {
        // Request audio permission
        await Audio.requestPermissionsAsync();
        // Set audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
        
        // Load default system sound
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sound.wav') // Add your sound file here
        );
        setSound(sound);
      } catch (error) {
        console.log('Error loading sound:', error);
      }
    }
    loadSound();
    return () => {
      sound?.unloadAsync();
    };
  }, []);

  const playAccurateSound = async () => {
    const now = Date.now();
    if (now - lastPlayTime.current > 4000) { // Changed to 4 seconds
      try {
        console.log('Playing sound...'); // Debug log
        await sound?.playAsync();
        lastPlayTime.current = now;
      } catch (error) {
        console.log('Error playing sound:', error);
      }
    }
  };
  

  const calculateQiblaDirection = (latitude: number, longitude: number) => {
    // Convert to radians
    const lat1 = latitude * (Math.PI / 180);
    const lon1 = longitude * (Math.PI / 180);
    const lat2 = KAABA_LAT * (Math.PI / 180);
    const lon2 = KAABA_LNG * (Math.PI / 180);

    // Calculate Qibla direction using enhanced formula
    const y = Math.sin(lon2 - lon1);
    const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(lon2 - lon1);
    let qibla = Math.atan2(y, x) * (180 / Math.PI);
    
    // Normalize to 0-360
    qibla = (qibla < 0) ? qibla + 360 : qibla;
    return qibla;
  };

  const getQiblaAngle = useCallback(() => {
    return ((qiblaDirection - magnetometer + 360) % 360);
  }, [qiblaDirection, magnetometer]);
  

  const getIndicatorColor = () => {
    const angle = Math.abs(getQiblaAngle() - 180);
    if (angle <= 5) return '#4CAF50'; // Green when very accurate
    if (angle <= 15) return '#FFC107'; // Yellow when close
    return '#F44336'; // Red when far
  };

  const getAccuracyText = () => {
    const angle = Math.abs(getQiblaAngle() - 180);
    if (angle <= 5) return 'Accurate';
    if (angle <= 15) return 'Close';
    return 'Far';
  };

  return (
    <LinearGradient
      colors={['#1a237e', '#311b92']}
      style={styles.container}
    >
      <ScrollView 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <MaterialCommunityIcons name="compass-rose" size={32} color="white" />
        <Text style={styles.title}>Qibla Finder</Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert" size={48} color="#ff6b6b" />
          <Text style={styles.error}>{errorMsg}</Text>
        </View>
      ) : (
        <>
          {!isFlat && (
            <Text style={styles.warning}>Please hold device flat</Text>
          )}
          
          <View style={styles.compassContainer}>
            <View style={[styles.compass, { transform: [{ rotate: `${-magnetometer}deg` }] }]}>
              <View 
                style={[
                  styles.qiblaIndicator, 
                  { 
                    transform: [{ rotate: `${qiblaDirection}deg` }],
                    borderBottomColor: getIndicatorColor()
                  }
                ]} 
              />
              <View 
                style={[
                  styles.circleEdge,
                  { transform: [{ rotate: `${qiblaDirection}deg` }] }
                ]}
              >
                <Image 
                  source={require('@/assets/images/kaaba.png')}
                  style={styles.kaabaIcon}
                />
              </View>
              <View style={styles.compassRose}>
                <Text style={[styles.direction, styles.north]}>N</Text>
                <Text style={[styles.direction, styles.east]}>E</Text>
                <Text style={[styles.direction, styles.south]}>S</Text>
                <Text style={[styles.direction, styles.west]}>W</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="compass" size={24} color={getIndicatorColor()} />
              <Text style={styles.degrees}>
                Qibla: {getQiblaAngle().toFixed(1)}° ({getAccuracyText()})
              </Text>
            </View>

            {location && (
              <View style={styles.infoCard}>
                <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#2196F3" />
                <Text style={styles.location}>
                  {location.coords.latitude.toFixed(4)}°N, {location.coords.longitude.toFixed(4)}°E
                </Text>
              </View>
            )}
          </View>
          <BannerAds />
        </>
      )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  compassContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  compass: {
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').width * 0.8,
    borderRadius: Dimensions.get('window').width * 0.4,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  compassRose: {
    width: '100%',
    height: '100%',
  },
  direction: {
    position: 'absolute',
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  north: {
    top: '5%',
    alignSelf: 'center',
  },
  south: {
    bottom: '5%',
    alignSelf: 'center',
  },
  east: {
    right: '5%',
    top: '48%',
  },
  west: {
    left: '5%',
    top: '48%',
  },
  qiblaIndicator: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 280,
    borderRightWidth: 26,
    borderBottomWidth: 0,
    borderLeftWidth: 26,
    borderTopColor: '#4CAF50',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    position: 'absolute',
  },
  infoContainer: {
    marginTop: 20,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 15,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  degrees: {
    marginLeft: 15,
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  location: {
    marginLeft: 15,
    fontSize: 18,
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: '#ff6b6b',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
  },
  warning: {
    color: '#FFC107',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  circleEdge: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  kaabaIcon: {
    width: 40,
    height: 40,
    position: 'absolute',
    bottom: 0, // Position at tip of indicator
    left: 122,
    resizeMode: 'contain',
    transform: [{ scaleY: -1 }],
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20
  },

});
