import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
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
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useStore } from '@/store/useStore';
import { Mic, Radio, SendHorizonal } from 'lucide-react-native';
import { BASE_URL } from '@/constants/api';

const ORCHESTRATOR = { _id: 'orchestrator', name: 'LOGISTRIA AI', avatar: '🧠' };

const INITIAL_MESSAGES: IMessage[] = [
  {
    _id: 'welcome',
    text: '🛰️ War Room online. I have full visibility across all supply chain agents — logistics, supplier, warehouse, and production. Send a command or ask anything.',
    createdAt: new Date(),
    user: ORCHESTRATOR,
  },
];

export default function ChatScreen() {
  const { user: authUser, role } = useStore();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<IMessage[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);

  // TAB_BOTTOM = height of the floating tab bar (74 fixed + device bottom inset)
  const TAB_BOTTOM = 74 + insets.bottom;

  const ME = {
    _id: authUser?.uid ?? 1,
    name: role ?? 'CLO',
    avatar: '🎯',
  };

  // ── Firestore listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'agent_logs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const firestoreMsgs: IMessage[] = snap.docs.map((doc) => {
            const d = doc.data();
            return {
              _id: doc.id,
              text: d.message ?? d.text ?? '',
              createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
              user: {
                _id: d.agentId ?? 2,
                name: d.agentName ?? 'Agent',
                avatar: d.agentAvatar ?? '🤖',
              },
            };
          });
          setMessages(firestoreMsgs);
        }
      },
      (err) => console.warn('[Firestore] agent_logs error:', err.message),
    );
    return () => unsub();
  }, []);

  // ── Pulse animation for mic button ────────────────────────────────────────
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) }),
      ),
      -1,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 }),
      ),
      -1,
    );
  }, []);

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // ── Call orchestrator backend ──────────────────────────────────────────────
  const callOrchestrator = useCallback(async (userText: string) => {
    setIsTyping(true);
    try {
      const res = await fetch(`${BASE_URL}/orchestrator/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();

      let reply = data.analysis || data.response || data.message || 'No response from orchestrator.';
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
        text: `❌ Orchestrator unreachable: ${err.message}`,
        createdAt: new Date(),
        user: ORCHESTRATOR,
      };
      setMessages((prev) => GiftedChat.append(prev, [errMsg]));
    } finally {
      setIsTyping(false);
    }
  }, []);

  // ── Send text message ──────────────────────────────────────────────────────
  const handleSend = useCallback((newMessages: IMessage[] = []) => {
    setMessages((prev) => GiftedChat.append(prev, newMessages));
    const userText = newMessages[0]?.text ?? '';
    if (userText) callOrchestrator(userText);
  }, [callOrchestrator]);

  // ── Mic press → voice command simulation ──────────────────────────────────
  const handleMicPress = useCallback(() => {
    const voiceMsg: IMessage = {
      _id: Date.now().toString(),
      text: '🎙️ What is the current supply chain risk level?',
      createdAt: new Date(),
      user: ME,
    };
    setMessages((prev) => GiftedChat.append(prev, [voiceMsg]));
    callOrchestrator('What is the current supply chain risk level and any active alerts?');
  }, [ME, callOrchestrator]);

  // ── Custom renderers ───────────────────────────────────────────────────────
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
        right: { color: '#081021', fontWeight: '600', fontSize: 13 },
        left: { color: 'rgba(255,255,255,0.88)', fontSize: 13 },
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
      placeholder="Transmit command…"
    />
  );

  const renderSend = (props: any) => (
    <View style={s.toolbarActions}>
      {/* Send button */}
      <GiftedSend {...props} containerStyle={s.sendContainer}>
        <View style={s.sendBtn}>
          <SendHorizonal size={16} color="#081021" strokeWidth={2.5} />
        </View>
      </GiftedSend>

      {/* Mic button */}
      <TouchableOpacity onPress={handleMicPress} style={s.micBtnWrap} activeOpacity={0.8}>
        <Animated.View style={[s.micPulse, pulseRingStyle]} />
        <View style={s.micBtn}>
          <Mic size={15} color="#081021" strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={s.headerInner}>
          <View style={s.headerLeft}>
            <View style={s.headerIconBox}>
              <Radio size={16} color="#FF8C00" />
            </View>
            <View>
              <Text style={s.headerTitle}>War Room</Text>
              <View style={s.headerSubRow}>
                <View style={s.onlineDot} />
                <Text style={s.headerSub}>3 AI agents monitoring</Text>
              </View>
            </View>
          </View>
          <View style={s.agentAvatarRow}>
            {['🏭', '🚚', '📈'].map((a, i) => (
              <View key={i} style={[s.agentAvatar, i > 0 && { marginLeft: -8 }]}>
                <Text style={{ fontSize: 14 }}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/*
        Wrap GiftedChat in a container with marginBottom = TAB_BOTTOM.
        This pushes GiftedChat's bottom (where the input toolbar lives)
        up above the floating tab bar so the input is always accessible.
        bottomOffset={74} tells GiftedChat's internal KeyboardAvoidingView
        to account for the fixed portion of the tab bar when raising for keyboard.
      */}
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
          isUsernameVisible
          isAvatarOnTop
          bottomOffset={74}
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

const MIC_SIZE = 36;
const SEND_SIZE = 36;

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
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00C9B1' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  agentAvatarRow: { flexDirection: 'row', alignItems: 'center' },
  agentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#132338',
    borderWidth: 1.5, borderColor: '#081021',
    alignItems: 'center', justifyContent: 'center',
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
  toolbarPrimary: {
    alignItems: 'center',
  },
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

  // Send + Mic actions
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  sendContainer: { justifyContent: 'center', height: 56 },
  sendBtn: {
    width: SEND_SIZE, height: SEND_SIZE, borderRadius: SEND_SIZE / 2,
    backgroundColor: '#00C9B1',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00C9B1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },

  // Mic with pulse
  micBtnWrap: {
    width: MIC_SIZE, height: MIC_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  micPulse: {
    position: 'absolute',
    width: MIC_SIZE, height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: '#FF8C00',
  },
  micBtn: {
    width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2,
    backgroundColor: '#FF8C00',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,210,100,0.5)',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
});
