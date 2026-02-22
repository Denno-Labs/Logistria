import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { signOut, updateProfile, updatePassword } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { useStore } from '@/store/useStore';
import * as ImagePicker from 'expo-image-picker';
import {
  Shield,
  Cpu,
  Wifi,
  Activity,
  LogOut,
  ChevronRight,
  Bell,
  Lock,
  Info,
  Zap,
  Camera,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const router  = useRouter();
  const { user, role, setUser, logout } = useStore();
  const [notifs, setNotifs] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.photoURL ?? null);
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const emailInitial = user?.email?.[0]?.toUpperCase() ?? '?';
  const displayEmail = user?.email ?? 'guest@logistria.io';

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll access is needed to update your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      try {
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: uri });
          setUser(auth.currentUser, role);
        }
      } catch {
        Alert.alert('Error', 'Failed to update avatar.');
      }
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Invalid', 'Password must be at least 6 characters.');
      return;
    }
    setPwLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        Alert.alert('Updated', 'Your access code has been updated.');
        setPwModalVisible(false);
        setNewPassword('');
      }
    } catch (err: any) {
      const msg =
        err.code === 'auth/requires-recent-login'
          ? 'Please log out and sign in again before changing your password.'
          : 'Failed to update password. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setPwLoading(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const performLogout = async () => {
    try {
      await signOut(auth);
      logout();
      router.replace('/login');
    } catch {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleLogout = () =>
    Alert.alert(
      'Terminate Session',
      'You will be disconnected from the Control Tower. Confirm?',
      [
        { text: 'Abort', style: 'cancel' },
        { text: 'Terminate', style: 'destructive', onPress: performLogout },
      ],
    );

  // ── Sub-components ────────────────────────────────────────────────────────
  const GlassSection = ({ children }: { children: React.ReactNode }) => (
    <View style={s.section}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={s.sectionInner}>{children}</View>
    </View>
  );

  const SettingRow = ({
    icon: Icon,
    label,
    sub,
    accent,
    onPress,
    right,
  }: {
    icon: any;
    label: string;
    sub?: string;
    accent?: string;
    onPress?: () => void;
    right?: React.ReactNode;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={s.settingRow}
    >
      <View style={[s.settingIconBox, { backgroundColor: (accent ?? '#FFFFFF') + '15', borderColor: (accent ?? '#FFFFFF') + '30' }]}>
        <Icon size={15} color={accent ?? 'rgba(255,255,255,0.5)'} />
      </View>
      <View style={s.settingMeta}>
        <Text style={s.settingLabel}>{label}</Text>
        {sub ? <Text style={s.settingSub}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={15} color="rgba(255,255,255,0.2)" /> : null)}
    </TouchableOpacity>
  );

  const HealthCard = ({
    icon: Icon,
    label,
    value,
    accent,
  }: {
    icon: any;
    label: string;
    value: string;
    accent: string;
  }) => (
    <View style={[s.healthCard, { borderColor: accent + '30' }]}>
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[s.healthIconBox, { backgroundColor: accent + '18', borderColor: accent + '35' }]}>
        <Icon size={15} color={accent} />
      </View>
      <Text style={[s.healthValue, { color: accent }]}>{value}</Text>
      <Text style={s.healthLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header ── */}
        <View style={s.profileCard}>
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={s.profileInner}>
            {/* Tappable Avatar */}
            <TouchableOpacity onPress={handleAvatarPick} activeOpacity={0.8} style={s.avatarWrap}>
              <View style={s.avatarRing} />
              <View style={s.avatar}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s.avatarImage} />
                ) : (
                  <Text style={s.avatarInitial}>{emailInitial}</Text>
                )}
              </View>
              {/* Camera edit badge */}
              <View style={s.cameraBadge}>
                <Camera size={9} color="#081021" />
              </View>
              {/* Online indicator */}
              <View style={s.avatarOnline} />
            </TouchableOpacity>

            {/* Info */}
            <View style={s.profileMeta}>
              <Text style={s.profileEmail} numberOfLines={1}>{displayEmail}</Text>
              <View style={s.roleBadge}>
                <Shield size={10} color="#00C9B1" />
                <Text style={s.roleBadgeText}>{role ?? 'Guest'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── System Health ── */}
        <Text style={s.sectionTitle}>SYSTEM HEALTH</Text>
        <View style={s.healthRow}>
          <HealthCard icon={Cpu}  label="AI Core"       value="ONLINE" accent="#00C9B1" />
          <HealthCard icon={Zap}  label="Agent Latency" value="12ms"   accent="#FF8C00" />
          <HealthCard icon={Wifi} label="Nodes Sync"    value="ACTIVE" accent="#00C9B1" />
        </View>

        {/* Live uptime strip */}
        <View style={s.uptimeStrip}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={s.uptimeInner}>
            <Activity size={12} color="#00C9B1" />
            <Text style={s.uptimeTxt}>Network Uptime</Text>
            <View style={s.uptimeBarTrack}>
              <View style={s.uptimeBarFill} />
            </View>
            <Text style={s.uptimePct}>99.97%</Text>
          </View>
        </View>

        {/* ── Preferences ── */}
        <Text style={s.sectionTitle}>PREFERENCES</Text>
        <GlassSection>
          <SettingRow
            icon={Bell}
            label="Push Notifications"
            sub="Alerts, delays, re-routes"
            accent="#FF8C00"
            right={
              <Switch
                value={notifs}
                onValueChange={setNotifs}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,140,0,0.5)' }}
                thumbColor={notifs ? '#FF8C00' : '#64748B'}
              />
            }
          />
        </GlassSection>

        {/* ── Account ── */}
        <Text style={s.sectionTitle}>ACCOUNT</Text>
        <GlassSection>
          <SettingRow
            icon={Lock}
            label="Change Password"
            sub="Update your access code"
            accent="#FF8C00"
            onPress={() => setPwModalVisible(true)}
          />
          <View style={s.rowDivider} />
          <SettingRow icon={Info} label="App Version" sub="Logistria v1.0.0 · Build 42" accent="#64748B" />
        </GlassSection>

        {/* ── Terminate Session ── */}
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.82} style={s.logoutBtnWrap}>
          <View style={s.logoutBtn}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={s.logoutBtnInner}>
              <LogOut size={16} color="#FF3B3B" />
              <Text style={s.logoutBtnText}>TERMINATE SESSION</Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={s.footer}>LOGISTRIA · Secure Control Tower · All transmissions encrypted</Text>
      </ScrollView>

      {/* ── Change Password Modal ── */}
      <Modal
        visible={pwModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPwModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setPwModalVisible(false)} activeOpacity={1} />
          <View style={s.modalCard}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={s.modalInner}>
              {/* Icon */}
              <View style={s.modalIconBox}>
                <Lock size={22} color="#FF8C00" />
              </View>
              <Text style={s.modalTitle}>Update Access Code</Text>
              <Text style={s.modalSub}>Minimum 6 characters required</Text>

              {/* New password input */}
              <View style={s.modalInputRow}>
                <Lock size={14} color="#00C9B1" />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new access code"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry
                  style={s.modalInput}
                  selectionColor="#FF8C00"
                  autoFocus
                />
              </View>

              {/* Actions */}
              <View style={s.modalActions}>
                <TouchableOpacity
                  onPress={() => { setPwModalVisible(false); setNewPassword(''); }}
                  style={s.modalCancelBtn}
                >
                  <Text style={s.modalCancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePasswordChange}
                  style={s.modalConfirmBtn}
                  disabled={pwLoading}
                >
                  {pwLoading
                    ? <ActivityIndicator color="#081021" size="small" />
                    : <Text style={s.modalConfirmText}>CONFIRM</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#081021' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },

  // Profile card
  profileCard: {
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden', marginBottom: 28,
  },
  profileInner: { flexDirection: 'row', alignItems: 'center', padding: 22, gap: 16 },
  avatarWrap:   { position: 'relative' },
  avatarRing: {
    position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 40, borderWidth: 1.5, borderColor: 'rgba(255,140,0,0.4)',
    borderStyle: 'dashed',
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderWidth: 2, borderColor: '#FF8C00',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage:   { width: 64, height: 64, borderRadius: 32 },
  avatarInitial: { fontSize: 26, fontWeight: '900', color: '#FF8C00' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF8C00', borderWidth: 1.5, borderColor: '#081021',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarOnline: {
    position: 'absolute', bottom: 20, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#00C9B1', borderWidth: 2, borderColor: '#081021',
  },
  profileMeta: { flex: 1, gap: 8 },
  profileEmail: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,201,177,0.1)', borderWidth: 1,
    borderColor: 'rgba(0,201,177,0.35)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  roleBadgeText: { fontFamily: 'SpaceMono', fontSize: 9, color: '#00C9B1', letterSpacing: 1 },

  // Section headers
  sectionTitle: {
    fontFamily: 'SpaceMono', fontSize: 9, color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2, marginBottom: 10,
  },

  // Health cards
  healthRow:   { flexDirection: 'row', gap: 10, marginBottom: 10 },
  healthCard: {
    flex: 1, borderRadius: 18, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden',
    alignItems: 'center', paddingVertical: 16, gap: 5,
  },
  healthIconBox: {
    width: 36, height: 36, borderRadius: 11, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  healthValue: { fontSize: 11, fontWeight: '900', fontFamily: 'SpaceMono', letterSpacing: 1 },
  healthLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  // Uptime strip
  uptimeStrip: {
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,201,177,0.15)',
    backgroundColor: 'rgba(0,201,177,0.03)', overflow: 'hidden', marginBottom: 24,
  },
  uptimeInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10,
  },
  uptimeTxt:      { fontSize: 11, color: 'rgba(255,255,255,0.55)', flex: 0 },
  uptimeBarTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  uptimeBarFill:  { width: '99.97%', height: 3, backgroundColor: '#00C9B1', borderRadius: 3 },
  uptimePct:      { fontFamily: 'SpaceMono', fontSize: 10, color: '#00C9B1', fontWeight: '700' },

  // Glass section
  section: {
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden', marginBottom: 24,
  },
  sectionInner: {},
  rowDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 },

  // Setting row
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  settingIconBox: {
    width: 36, height: 36, borderRadius: 11, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  settingMeta:  { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  settingSub:   { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  // Logout button
  logoutBtnWrap: { marginBottom: 24 },
  logoutBtn: {
    borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,59,59,0.5)',
    backgroundColor: 'rgba(255,59,59,0.04)', overflow: 'hidden',
  },
  logoutBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  logoutBtnText: {
    fontFamily: 'SpaceMono', fontSize: 12, fontWeight: '900',
    color: '#FF3B3B', letterSpacing: 2,
  },

  // Footer
  footer: {
    fontFamily: 'SpaceMono', fontSize: 8, color: 'rgba(255,255,255,0.15)',
    textAlign: 'center', letterSpacing: 1, marginBottom: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%', borderRadius: 28, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
    backgroundColor: 'rgba(8,16,33,0.5)',
  },
  modalInner: { padding: 28, alignItems: 'center', gap: 12 },
  modalIconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,140,0,0.12)', borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.35)', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  modalSub:   { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  modalInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  modalInput: { flex: 1, fontSize: 14, color: '#FFFFFF', padding: 0 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center',
  },
  modalCancelText: { fontFamily: 'SpaceMono', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#FF8C00', alignItems: 'center',
    shadowColor: '#FF8C00', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  modalConfirmText: { fontFamily: 'SpaceMono', fontSize: 11, fontWeight: '900', color: '#081021', letterSpacing: 1 },
});
