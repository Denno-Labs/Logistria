import { useState, useCallback, useEffect } from 'react';
import {
    View, Text, ScrollView, StyleSheet, StatusBar,
    TouchableOpacity, RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Factory, TrendingUp, AlertTriangle, Check, X, Info, Clock } from 'lucide-react-native';
import { BASE_URL } from '@/constants/api';

const API = BASE_URL;

const f = (n?: number | null) => (n == null ? '—' : n.toLocaleString());

const GCard = ({ children, accent }: { children: React.ReactNode; accent?: string }) => (
    <View style={[s.card, accent ? { borderColor: accent + '33' } : null]}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={s.cardInner}>{children}</View>
    </View>
);

export default function SupplierScreen() {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetch(`${API}/procurement/orders`);
            const data = await res.json();
            setOrders(Array.isArray(data) ? data.reverse() : []); // Newest first
        } catch (e) {
            console.warn('[Supplier]', e);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, []);

    const handleAction = async (po_id: string, action: 'approve' | 'reject') => {
        setProcessingId(po_id);
        try {
            const res = await fetch(`${API}/procurement/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ po_id })
            });

            const result = await res.json();
            if (result.status === 'SUCCESS' || result.status === 'APPROVED' || result.status === 'REJECTED') {
                // Optimized update: update local state immediately
                setOrders(prev => prev.map(o =>
                    o.po_id === po_id
                        ? { ...o, status: action === 'approve' ? 'APPROVED' : 'REJECTED' }
                        : o
                ));
            } else {
                Alert.alert('Action Failed', result.message || 'Something went wrong');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Network request failed');
        } finally {
            setProcessingId(null);
        }
    };

    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    const approvedCount = orders.filter(o => o.status === 'APPROVED').length;
    const completedCount = orders.filter(o => o.status === 'COMPLETED').length;

    return (
        <View style={{ flex: 1, backgroundColor: '#081021' }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={[s.header, { paddingTop: insets.top + 10 }]}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                    <View style={s.badge}>
                        <Factory size={10} color="#FF8C00" />
                        <Text style={s.badgeTxt}>SUPPLIER AGENT</Text>
                    </View>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF', lineHeight: 34 }}>{'Procurement\nOrders'}</Text>
                </View>

                {/* Stats Row */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 16, gap: 10 }}>
                    <View style={s.statBox}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#FF8C00' }}>{pendingCount}</Text>
                        <Text style={s.statLbl}>Wait Approval</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#00C9B1' }}>{approvedCount}</Text>
                        <Text style={s.statLbl}>In Transit</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#BC8CFF' }}>{completedCount}</Text>
                        <Text style={s.statLbl}>Received</Text>
                    </View>
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                    <ActivityIndicator color="#FF8C00" size="large" />
                    <Text style={{ fontFamily: 'SpaceMono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>SYNCING ORDERS…</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#FF8C00" />}
                >
                    {orders.length === 0 ? (
                        <GCard>
                            <View style={{ alignItems: 'center', padding: 24 }}>
                                <Factory size={28} color="#64748B" />
                                <Text style={{ color: '#64748B', marginTop: 10, fontSize: 13 }}>No procurement orders found.</Text>
                            </View>
                        </GCard>
                    ) : (
                        orders.map((o: any) => {
                            const isPending = o.status === 'PENDING';
                            const isAppr = o.status === 'APPROVED';
                            const isRej = o.status === 'REJECTED';
                            const isComp = o.status === 'COMPLETED';

                            const col = isPending ? '#FF8C00' : isAppr ? '#00C9B1' : isRej ? '#FF3B3B' : '#BC8CFF';
                            const isProcessing = processingId === o.po_id;

                            const confPct = Math.round((o.confidence_level || 0) * 100);
                            const riskNum = parseFloat(o.risk_level);
                            const riskStr = isNaN(riskNum) ? o.risk_level : (riskNum * 100).toFixed(1) + '%';

                            return (
                                <GCard key={o.po_id} accent={col}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>{o.po_id}</Text>
                                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{o.material_id} • Qty: {f(o.quantity_to_order)}</Text>
                                        </View>
                                        <View style={[s.pill, { backgroundColor: col + '18', borderColor: col + '44' }]}>
                                            <Text style={[s.pillTxt, { color: col }]}>{o.status}</Text>
                                        </View>
                                    </View>

                                    {/* Supplier info */}
                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                                        <View style={[s.iconBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                            <Factory size={16} color="rgba(255,255,255,0.6)" />
                                        </View>
                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Selected Supplier</Text>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>{o.selected_supplier}</Text>
                                        </View>
                                        {o.expected_delivery_date && (
                                            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Expected</Text>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#00C9B1' }}>{o.expected_delivery_date}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* AI Reasoning */}
                                    <View style={{ marginTop: 14, gap: 10 }}>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            <View style={{ flex: 1, backgroundColor: 'rgba(0,201,177,0.08)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(0,201,177,0.2)' }}>
                                                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>AI Confidence</Text>
                                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#00C9B1', marginTop: 2 }}>{confPct}%</Text>
                                            </View>
                                            <View style={{ flex: 1, backgroundColor: 'rgba(255,140,0,0.08)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)' }}>
                                                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Predicted Risk</Text>
                                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FF8C00', marginTop: 2 }}>{riskStr}</Text>
                                            </View>
                                        </View>

                                        {o.reasoning && (
                                            <View style={{ backgroundColor: 'rgba(188,140,255,0.08)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(188,140,255,0.2)' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                                    <TrendingUp size={12} color="#BC8CFF" />
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#BC8CFF', textTransform: 'uppercase' }}>Agent Reasoning</Text>
                                                </View>
                                                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18 }}>{o.reasoning}</Text>
                                            </View>
                                        )}

                                        {o.mitigation_strategy && isPending && (
                                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8 }}>
                                                <AlertTriangle size={14} color="#FF8C00" style={{ marginTop: 2 }} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FF8C00', textTransform: 'uppercase' }}>Mitigation</Text>
                                                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{o.mitigation_strategy}</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    {/* Action Buttons */}
                                    {isPending && (
                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                                            <TouchableOpacity
                                                style={[s.actionBtn, s.approveBtn]}
                                                onPress={() => handleAction(o.po_id, 'approve')}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                                                    <>
                                                        <Check size={18} color="#FFFFFF" strokeWidth={3} />
                                                        <Text style={s.actionBtnTxt}>APPROVE</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[s.actionBtn, s.rejectBtn]}
                                                onPress={() => handleAction(o.po_id, 'reject')}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                                                    <>
                                                        <X size={18} color="#FFFFFF" strokeWidth={3} />
                                                        <Text style={s.actionBtnTxt}>REJECT</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {isAppr && (
                                        <View style={s.infoBar}>
                                            <Clock size={14} color="#00C9B1" />
                                            <Text style={s.infoBarTxt}>Awaiting delivery confirmation.</Text>
                                        </View>
                                    )}

                                    {isRej && (
                                        <View style={[s.infoBar, { backgroundColor: 'rgba(255,59,59,0.05)' }]}>
                                            <X size={14} color="#FF3B3B" />
                                            <Text style={[s.infoBarTxt, { color: '#FF3B3B' }]}>Order has been rejected.</Text>
                                        </View>
                                    )}
                                </GCard>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    header: { overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,140,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
    badgeTxt: { fontFamily: 'SpaceMono', fontSize: 8, color: '#FF8C00', letterSpacing: 2 },
    statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: 2 },
    card: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden', marginBottom: 16 },
    cardInner: { padding: 20 },
    pill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
    pillTxt: { fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 1, fontWeight: '700' },
    iconBox: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

    actionBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    approveBtn: { backgroundColor: '#00C9B1', shadowColor: '#00C9B1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    rejectBtn: { backgroundColor: '#FF3B3B', shadowColor: '#FF3B3B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    actionBtnTxt: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },

    infoBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,201,177,0.05)', borderRadius: 10, padding: 12, marginTop: 16 },
    infoBarTxt: { fontSize: 12, color: '#00C9B1', fontWeight: '600' }
});
