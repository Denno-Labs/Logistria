import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { useStore } from '@/store/useStore';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Shield,
  Check,
  ChevronRight,
  Cpu,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const ROLES = [
  'Chief Logistics Officer',
  'Supply Officer',
  'Logistics Officer',
  'Warehouse Officer',
] as const;

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered in the system.',
  'auth/invalid-email': 'Invalid email format. Please recheck your credentials.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Access denied.',
  'auth/invalid-credential': 'Invalid credentials. Please try again.',
  'auth/too-many-requests': 'Too many failed attempts. System locked temporarily.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useStore();

  const [email, setEmailVal] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }
    if (!isLogin && !selectedRole) {
      Alert.alert('Role Required', 'Select your access clearance level to proceed.');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
        const snap = await getDoc(doc(db, 'users', user.uid));
        const role = snap.exists() ? (snap.data().role as string) : null;
        setUser(user, role);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          role: selectedRole,
          createdAt: new Date().toISOString(),
        });
        setUser(user, selectedRole);
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const message =
        (code && FIREBASE_ERRORS[code]) ?? 'Authentication failed. Please try again.';
      Alert.alert('⚠️ Access Denied', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Subtle scan-line grid */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={i} style={[styles.scanLine, { top: i * 80 }]} />
        ))}
        {/* Corner accent glow */}
        <View style={styles.glowTopRight} />
        <View style={styles.glowBottomLeft} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <MotiView
            from={{ opacity: 0, translateY: -24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 700 }}
            style={styles.header}
          >
            <View style={styles.headerBadge}>
              <Shield size={11} color="#FF8C00" />
              <Text style={styles.headerBadgeText}>SECURE ACCESS PORTAL</Text>
            </View>

            <Text style={styles.logoText}>LOGISTRIA</Text>
            <Text style={styles.logoSub}>SUPPLY CHAIN CONTROL TOWER</Text>
          </MotiView>

          {/* ── Form Card ── */}
          <MotiView
            from={{ opacity: 0, translateY: 32 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 700, delay: 200 }}
          >
            <View style={styles.card}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />

              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderIcon}>
                  <Cpu size={14} color="#FF8C00" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>
                    {isLogin ? 'System Access' : 'Request Clearance'}
                  </Text>
                  <Text style={styles.cardSub}>
                    {isLogin
                      ? 'Authenticate to enter the Control Tower'
                      : 'Register your credentials to join the network'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputIconBox}>
                    <Mail size={16} color="#00C9B1" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmailVal}
                    placeholder="operator@logistria.io"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    selectionColor="#FF8C00"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ACCESS CODE</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputIconBox}>
                    <Lock size={16} color="#00C9B1" />
                  </View>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.textInput, { flex: 1 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••••••"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleAuth}
                    selectionColor="#FF8C00"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color="rgba(255,255,255,0.35)" />
                    ) : (
                      <Eye size={16} color="rgba(255,255,255,0.35)" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Role Selector — signup only */}
              {!isLogin && (
                <MotiView
                  from={{ opacity: 0, translateY: 12 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 400 }}
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>ACCESS CLEARANCE LEVEL</Text>
                    <View style={styles.rolesGrid}>
                      {ROLES.map((role) => {
                        const active = selectedRole === role;
                        return (
                          <TouchableOpacity
                            key={role}
                            onPress={() => setSelectedRole(role)}
                            activeOpacity={0.75}
                            style={[styles.rolePill, active && styles.rolePillActive]}
                          >
                            {active && (
                              <View style={styles.rolePillGlow} />
                            )}
                            <Text
                              style={[
                                styles.rolePillText,
                                active && styles.rolePillTextActive,
                              ]}
                              numberOfLines={2}
                            >
                              {role}
                            </Text>
                            {active && (
                              <View style={styles.rolePillCheck}>
                                <Check size={9} color="#FF8C00" strokeWidth={3} />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </MotiView>
              )}

              {/* Action Button */}
              <TouchableOpacity
                onPress={handleAuth}
                disabled={isLoading}
                activeOpacity={0.82}
                style={styles.actionBtnWrap}
              >
                {/* Glow halo */}
                <View style={styles.actionBtnGlow} />
                <View style={[styles.actionBtn, isLoading && { opacity: 0.75 }]}>
                  {isLoading ? (
                    <ActivityIndicator color="#081021" size="small" />
                  ) : (
                    <>
                      <Zap size={16} color="#081021" fill="#081021" />
                      <Text style={styles.actionBtnText}>
                        {isLogin ? 'INITIALIZE CONNECTION' : 'GRANT CLEARANCE'}
                      </Text>
                      <ChevronRight size={16} color="#081021" strokeWidth={2.5} />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </MotiView>

          {/* ── Toggle ── */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 600, delay: 500 }}
            style={styles.toggleRow}
          >
            <Text style={styles.toggleText}>
              {isLogin ? 'Need access? ' : 'Already registered? '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsLogin((v) => !v);
                setSelectedRole(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.toggleLink}>
                {isLogin ? 'Request Clearance →' : 'Login Here →'}
              </Text>
            </TouchableOpacity>
          </MotiView>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const ROLE_PILL_W = (width - 40 - 24 - 10) / 2; // 2 cols, card padding + gap

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#081021' },

  // Background decorations
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,201,177,0.03)',
  },
  glowTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FF8C00',
    opacity: 0.06,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#00C9B1',
    opacity: 0.05,
  },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 72, paddingBottom: 16 },

  // Header
  header: { marginBottom: 28, alignItems: 'flex-start' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    backgroundColor: 'rgba(255,140,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  headerBadgeText: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: '#FF8C00',
    letterSpacing: 2.5,
  },
  logoText: {
    fontFamily: 'SpaceMono',
    fontSize: 36,
    fontWeight: '900',
    color: '#FF8C00',
    letterSpacing: 8,
    textShadowColor: '#FF8C00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  logoSub: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: '#00C9B1',
    letterSpacing: 4,
    marginTop: 6,
    textShadowColor: '#00C9B1',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  // Card
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
    padding: 24,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  cardHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,140,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  cardSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.38)',
    marginTop: 3,
    lineHeight: 17,
    maxWidth: width - 120,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 22,
  },

  // Inputs
  inputGroup: { marginBottom: 18 },
  inputLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  inputIconBox: {
    width: 46,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(0,201,177,0.05)',
  },
  textInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    letterSpacing: 0.5,
  },
  eyeBtn: {
    width: 46,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Roles
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rolePill: {
    width: ROLE_PILL_W,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  rolePillActive: {
    borderColor: '#FF8C00',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,140,0,0.06)',
  },
  rolePillGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,140,0,0.06)',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
  },
  rolePillTextActive: { color: '#FF8C00' },
  rolePillCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action button
  actionBtnWrap: { marginTop: 8, position: 'relative', alignItems: 'center' },
  actionBtnGlow: {
    position: 'absolute',
    top: 4,
    left: 20,
    right: 20,
    height: 48,
    borderRadius: 28,
    backgroundColor: '#FF8C00',
    opacity: 0.35,
    // soft blur shadow via shadow props
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  actionBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FF8C00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,200,80,0.4)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#081021',
    fontFamily: 'SpaceMono',
    letterSpacing: 1.5,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    flexWrap: 'wrap',
    gap: 4,
  },
  toggleText: { fontSize: 13, color: 'rgba(255,255,255,0.35)' },
  toggleLink: {
    fontSize: 13,
    color: '#00C9B1',
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(0,201,177,0.4)',
  },
});
