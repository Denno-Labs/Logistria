import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Bypass authentication entirely
      router.replace('/(tabs)');
    }, 2000); // Shorter splash screen
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 1000 }}
        style={styles.content}
      >
        {/* Logo glow ring */}
        <MotiView
          from={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.15, scale: 1.4 }}
          transition={{ type: 'timing', duration: 1400, delay: 200 }}
          style={styles.glowRing}
        />

        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 900, delay: 300 }}
        >
          <Text style={styles.title}>LOGISTRIA</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 800, delay: 700 }}
        >
          <Text style={styles.subtitle}>SUPPLY CHAIN CONTROL TOWER</Text>
        </MotiView>

        {/* Animated loading bar */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 1100 }}
          style={styles.barTrack}
        >
          <MotiView
            from={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ type: 'timing', duration: 1600, delay: 1300 }}
            style={styles.barFill}
          />
        </MotiView>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081021',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#FF8C00',
  },
  title: {
    fontFamily: 'SpaceMono',
    fontSize: 44,
    fontWeight: '900',
    color: '#FF8C00',
    letterSpacing: 10,
    textShadowColor: '#FF8C00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  subtitle: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    color: '#00C9B1',
    letterSpacing: 5,
    marginTop: 10,
    textShadowColor: '#00C9B1',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  barTrack: {
    width: 200,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginTop: 48,
    overflow: 'hidden',
  },
  barFill: {
    height: 2,
    backgroundColor: '#FF8C00',
    borderRadius: 2,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
});
