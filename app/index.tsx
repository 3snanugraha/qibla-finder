import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Dimensions, Image, ScrollView } from 'react-native';
import { Magnetometer, Gyroscope } from 'expo-sensors';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BannerAds from '@/components/bannerAds';

export default function QiblaCompass() {
  const [magnetometer, setMagnetometer] = useState(0);
  const [gyroscope, setGyroscope] = useState({ x: 0, y: 0, z: 0 });
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFlat, setIsFlat] = useState(true);

  const getMagneticDeclination = (lat: number, lng: number): number => {
    const year = new Date().getFullYear();
    const baseYear = 2020;
    const yearFraction = (year - baseYear);
    
    if (lng >= 90 && lng <= 150 && lat >= -10 && lat <= 10) {
      // Southeast Asia region
      return 0.5 + (yearFraction * 0.08);
    } else if (lng >= 30 && lng <= 50 && lat >= 15 && lat <= 30) {
      // Middle East region
      return 2.5 + (yearFraction * 0.12);
    }
    
    return 0;
  };

  // Kaaba coordinates
  const KAABA_LAT = 21.422487;
  const KAABA_LNG = 39.826206;

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const toDegrees = (radians: number): number => {
    return radians * (180 / Math.PI);
  };

  const calculateQiblaDirection = (latitude: number, longitude: number) => {
    const lat1 = toRadians(latitude);
    const lng1 = toRadians(longitude);
    const lat2 = toRadians(KAABA_LAT);
    const lng2 = toRadians(KAABA_LNG);

    const dL = lng2 - lng1;
    const cosLat2 = Math.cos(lat2);
    const sinDL = Math.sin(dL);
    const cosLat1 = Math.cos(lat1);
    const sinLat1 = Math.sin(lat1);
    const sinLat2 = Math.sin(lat2);

    const y = sinDL * cosLat2;
    const x = (cosLat1 * sinLat2) - (sinLat1 * cosLat2 * Math.cos(dL));
    let bearing = Math.atan2(y, x);
    bearing = toDegrees(bearing);

    return (bearing + 360) % 360;
  };

  useEffect(() => {
    let magSubscription: { remove: () => void; };
    let gyroSubscription: { remove: () => void; };

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        setLocation(currentLocation);

        if (currentLocation) {
          const qibla = calculateQiblaDirection(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude
          );
          setQiblaDirection(qibla);
        }

        Magnetometer.setUpdateInterval(100);
        magSubscription = Magnetometer.addListener(data => {
          let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
          angle = (angle < 0) ? angle + 360 : angle;
          setMagnetometer(angle);
        });

        Gyroscope.setUpdateInterval(100);
        gyroSubscription = Gyroscope.addListener(data => {
          setGyroscope(data);
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

  const getQiblaAngle = useCallback(() => {
    if (!location) return 0;
  
    const declination = getMagneticDeclination(
      location.coords.latitude,
      location.coords.longitude
    );
    
    const trueHeading = (magnetometer + declination + 360) % 360;
    let qiblaAngle = qiblaDirection - trueHeading;
    qiblaAngle = ((qiblaAngle + 180) % 360) - 180;
    
    return Math.abs(qiblaAngle);
  }, [qiblaDirection, magnetometer, location]);

  const getIndicatorColor = () => {
    const angle = getQiblaAngle();
    if (angle <= 5) return '#4CAF50';
    if (angle <= 15) return '#FFC107';
    return '#F44336';
  };

  const getAccuracyText = () => {
    const angle = getQiblaAngle();
    if (angle <= 5) return 'Sangat Akurat';
    if (angle <= 15) return 'Cukup Akurat';
    return 'Kurang Akurat';
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
    bottom: 0,
    left: 122,
    resizeMode: 'contain',
    transform: [{ scaleY: -1 }],
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20
  },
});
