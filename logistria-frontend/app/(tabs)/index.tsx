import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GiftedChat,
  Bubble,
  InputToolbar,
  Composer,
  Send as GiftedSend,
  IMessage,
} from 'react-native-gifted-chat';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import {
  Brain,
  SendHorizonal,
  AlertTriangle,
  X,
  Activity,
  ShieldAlert,
} from 'lucide-react-native';
import { BASE_URL } from '@/constants/api';

// ── Config ───────────────────────────────────────────
const API_BASE = BASE_URL;

const ORCHESTRATOR = { _id: 'orchestrator', name: 'LOGISTRIA AI', avatar: '🧠' };
const ME = { _id: 'user', name: 'You', avatar: '🎯' };

// ── Alert type → color mapping ────────────────────────
const ALERT_COLORS: Record<string, string> = {
  CRITICAL: '#FF3B30',
  HIGH: '#FF8C00',
  MEDIUM: '#FFD60A',
  LOW: '#00C9B1',
};

// ── Types ─────────────────────────────────────────────
interface Alert {
  type: string;
  entity_id: string;
  risk_level: string;
  message: string;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BOTTOM = 74 + insets.bottom;

  const [messages, setMessages] = useState<IMessage[]>([
    {
      _id: 'welcome',
      text: '🛰️ LOGISTRIA Orchestrator online.\nAsk me anything about shipments, inventory, production, or procurement. I have full visibility across the entire supply chain.',
      createdAt: new Date(),
      user: ORCHESTRATOR,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // ── Pulse animation for alert dot ──────────────────
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) }),
      ),
      -1,
    );
  }, []);
  const pulseDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // ── Poll alerts ────────────────────────────────────
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE}/orchestrator/alerts`);
        if (res.ok) {
          const data: Alert[] = await res.json();
          setAlerts(data);
        }
      } catch (err) {
        console.warn('[Alerts]', err);
      } finally {
        setAlertsLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Send message ───────────────────────────────────
  const handleSend = useCallback(async (newMessages: IMessage[] = []) => {
    // append user message
    setMessages((prev) => GiftedChat.append(prev, newMessages));
    const userText = newMessages[0]?.text ?? '';
    if (!userText) return;

    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/orchestrator/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();

      // Build a readable reply from the structured JSON
      let reply = data.analysis || 'No analysis returned.';
      if (data.root_cause) reply += `\n\n🔍 Root cause: ${data.root_cause}`;
      if (data.recommended_actions?.length) {
        reply += '\n\n📋 Recommended actions:';
        data.recommended_actions.forEach((a: string, i: number) => {
          reply += `\n${i + 1}. ${a}`;
        });
      }
      if (data.risk_level) reply += `\n\n⚠️ Risk: ${data.risk_level}`;
      if (data.confidence_score) reply += ` | Confidence: ${(data.confidence_score * 100).toFixed(0)}%`;

      const aiMsg: IMessage = {
        _id: Date.now().toString(),
        text: reply,
        createdAt: new Date(),
        user: ORCHESTRATOR,
      };

      setMessages((prev) => GiftedChat.append(prev, [aiMsg]));
    } catch (err: any) {
      const errMsg: IMessage = {
        _id: Date.now().toString(),
        text: `❌ Failed to reach orchestrator: ${err.message}`,
        createdAt: new Date(),
        user: ORCHESTRATOR,
      };
      setMessages((prev) => GiftedChat.append(prev, [errMsg]));
    } finally {
      setIsTyping(false);
    }
  }, []);

  // ── Renderers ──────────────────────────────────────
  const renderBubble = (props: any) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: '#00C9B1',
          borderRadius: 18,
          borderBottomRightRadius: 4,
          shadowColor: '#00C9B1',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        },
        left: {
          backgroundColor: '#132338',
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.07)',
        },
      }}
      textStyle={{
        right: { color: '#081021', fontWeight: '600', fontSize: 13, lineHeight: 20 },
        left: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 20 },
      }}
    />
  );

  const renderInputToolbar = (props: any) => (
    <InputToolbar
      {...props}
      containerStyle={s.toolbar}
      primaryStyle={s.toolbarPrimary}
    />
  );

  const renderComposer = (props: any) => (
    <Composer
      {...props}
      textInputStyle={s.composerInput}
      placeholderTextColor="rgba(255,255,255,0.28)"
      placeholder="Ask about your supply chain…"
    />
  );

  const renderSend = (props: any) => (
    <GiftedSend {...props} containerStyle={s.sendContainer}>
      <View style={s.sendBtn}>
        <SendHorizonal size={16} color="#081021" strokeWidth={2.5} />
      </View>
    </GiftedSend>
  );

  // ── Alert banner ───────────────────────────────────
  const criticalAlerts = alerts.filter(
    (a) => a.risk_level === 'CRITICAL' || a.risk_level === 'HIGH'
  );
  const showAlertBanner = criticalAlerts.length > 0 && !alertsDismissed;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={s.headerInner}>
          <View style={s.headerLeft}>
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 600 }}
            >
              <View style={s.headerIconBox}>
                <Brain size={18} color="#FF8C00" />
              </View>
            </MotiView>
            <View>
              <Text style={s.headerTitle}>LOGISTRIA</Text>
              <View style={s.headerSubRow}>
                <View style={s.onlineDot} />
                <Text style={s.headerSub}>SUPPLY CHAIN AI ASSISTANT</Text>
              </View>
            </View>
          </View>
          {criticalAlerts.length > 0 && (
            <View style={s.alertBadge}>
              <Animated.View style={[s.alertPulseDot, pulseDotStyle]} />
              <ShieldAlert size={14} color="#FF3B30" />
              <Text style={s.alertBadgeText}>{criticalAlerts.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Alert Banner ── */}
      {showAlertBanner && (
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={s.alertBanner}
        >
          <View style={s.alertBannerInner}>
            <AlertTriangle size={16} color="#FF3B30" />
            <View style={s.alertBannerText}>
              <Text style={s.alertBannerTitle}>
                {criticalAlerts.length} HIGH-RISK ALERT{criticalAlerts.length > 1 ? 'S' : ''}
              </Text>
              <Text style={s.alertBannerDesc} numberOfLines={2}>
                {criticalAlerts[0]?.message}
                {criticalAlerts.length > 1 ? ` (+${criticalAlerts.length - 1} more)` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setAlertsDismissed(true)} hitSlop={12}>
              <X size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        </MotiView>
      )}

      {/* ── Chat ── */}
      <View style={[s.chatContainer, { marginBottom: TAB_BOTTOM }]}>
        <GiftedChat
          messages={messages}
          onSend={handleSend}
          user={ME}
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderComposer={renderComposer}
          renderSend={renderSend}
          isTyping={isTyping}
          messagesContainerStyle={s.msgContainer}
          timeTextStyle={{
            left: { color: 'rgba(255,255,255,0.25)', fontSize: 10 },
            right: { color: 'rgba(0,0,0,0.3)', fontSize: 10 },
          }}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#081021' },
  chatContainer: { flex: 1 },

  // Header
  header: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'SpaceMono',
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00C9B1' },
  headerSub: {
    fontFamily: 'SpaceMono',
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },

  // Alert badge in header
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  alertPulseDot: {
    position: 'absolute',
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,59,48,0.4)',
  },
  alertBadgeText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '800',
    color: '#FF3B30',
  },

  // Alert banner
  alertBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
    overflow: 'hidden',
  },
  alertBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  alertBannerText: { flex: 1 },
  alertBannerTitle: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  alertBannerDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
  },

  // Messages
  msgContainer: { backgroundColor: '#081021' },

  // Input toolbar
  toolbar: {
    backgroundColor: '#0D1B2E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 56,
  },
  toolbarPrimary: { alignItems: 'center' },
  composerInput: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    marginTop: 4,
    marginBottom: 4,
    fontSize: 14,
    lineHeight: 18,
  },

  // Send
  sendContainer: { justifyContent: 'center', height: 56, paddingRight: 4 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00C9B1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C9B1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
});
