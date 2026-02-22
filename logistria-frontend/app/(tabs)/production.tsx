import { useState, useCallback, useEffect } from 'react';
import {
    View, Text, ScrollView, StyleSheet, StatusBar,
    TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import {
    Factory, ChevronRight, CheckCircle2, AlertTriangle,
    Clock, Zap, RotateCcw, Plus, ShieldCheck, Package,
} from 'lucide-react-native';
import { BASE_URL } from '@/constants/api';

const API = BASE_URL;

// Production stages in order
const STAGES = ['MATERIAL_ISSUED', 'FABRICATION', 'ASSEMBLY', 'PAINTING', 'QUALITY_CHECK', 'COMPLETED'];

const STAGE_ENDPOINT: Record<string, string> = {
    MATERIAL_ISSUED: 'material-issued',
    FABRICATION: 'fabrication',
    ASSEMBLY: 'assembly',
    PAINTING: 'painting',
    QUALITY_CHECK: 'quality-check',
};

const STAGE_LABEL: Record<string, string> = {
    MATERIAL_ISSUED: 'Material Issued',
    FABRICATION: 'Fabrication',
    ASSEMBLY: 'Assembly',
    PAINTING: 'Painting',
    QUALITY_CHECK: 'Quality Check',
    COMPLETED: 'Completed',
};

const STATUS_COLOR: Record<string, string> = {
    COMPLETED: '#00C9B1',
    IN_PROGRESS: '#FF8C00',
    CREATED: '#58a6ff',
    FAILED: '#FF3B30',
    PASSED: '#00C9B1',
};

function stageColor(stage: string, status: string): string {
    if (status === 'COMPLETED') return '#00C9B1';
    if (status === 'IN_PROGRESS') return '#FF8C00';
    return '#58a6ff';
}

const f = (n?: number | null) => (n == null ? '—' : n.toLocaleString());

const GCard = ({ children, accent }: { children: React.ReactNode; accent?: string }) => (
    <View style={[s.card, accent ? { borderColor: accent + '33' } : null]}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={s.cardInner}>{children}</View>
    </View>
);

// ── Stage progress bar ────────────────────────────────────────────────────────
function StageBar({ currentStage, status }: { currentStage: string; status: string }) {
    const currentIdx = STAGES.indexOf(currentStage);
    return (
        <View style={s.stageRow}>
            {STAGES.slice(0, -1).map((stage, idx) => {
                const done = idx < currentIdx || status === 'COMPLETED';
                const active = idx === currentIdx && status !== 'COMPLETED';
                const col = done ? '#00C9B1' : active ? '#FF8C00' : 'rgba(255,255,255,0.15)';
                return (
                    <View key={stage} style={{ flex: 1, alignItems: 'center' }}>
                        <View style={[s.stageDot, { backgroundColor: col, borderColor: col }]} />
                        {idx < STAGES.length - 2 && (
                            <View style={[s.stageLine, { backgroundColor: done ? '#00C9B1' : 'rgba(255,255,255,0.1)' }]} />
                        )}
                        <Text style={[s.stageLabel, { color: done || active ? '#fff' : 'rgba(255,255,255,0.3)' }]} numberOfLines={1}>
                            {STAGE_LABEL[stage]?.split(' ')[0]}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

// ── Order card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onAdvance, onQC, advancing }: {
    order: any;
    onAdvance: (order: any) => void;
    onQC: (order: any) => void;
    advancing: boolean;
}) {
    const col = stageColor(order.current_stage, order.status);
    const isCompleted = order.status === 'COMPLETED' || order.current_stage === 'COMPLETED';
    const isQCStage = order.current_stage === 'PAINTING' && !isCompleted;
    const canAdvance = !isCompleted && !isQCStage;

    return (
        <GCard accent={col}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={[s.iconBox, { backgroundColor: col + '18', borderColor: col + '35' }]}>
                    <Factory size={15} color={col} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.orderId}>{order.production_id}</Text>
                    <Text style={s.sub}>Product: {order.product_id} · Qty: {f(order.target_quantity)}</Text>
                </View>
                <View style={[s.pill, { backgroundColor: col + '18', borderColor: col + '44' }]}>
                    <Text style={[s.pillTxt, { color: col }]}>{order.status ?? '—'}</Text>
                </View>
            </View>

            <StageBar currentStage={order.current_stage} status={order.status} />

            <View style={{ flexDirection: 'row', marginTop: 4, gap: 6 }}>
                <Text style={s.sub}>Stage: </Text>
                <Text style={[s.sub, { color: col, fontWeight: '700' }]}>
                    {STAGE_LABEL[order.current_stage] ?? order.current_stage}
                </Text>
            </View>

            {!isCompleted && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    {canAdvance && (
                        <TouchableOpacity
                            style={[s.actionBtn, { backgroundColor: '#FF8C00', flex: 1 }]}
                            onPress={() => onAdvance(order)}
                            disabled={advancing}
                        >
                            {advancing
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <><ChevronRight size={14} color="#fff" /><Text style={s.actionTxt}>Advance Stage</Text></>
                            }
                        </TouchableOpacity>
                    )}
                    {isQCStage && (
                        <TouchableOpacity
                            style={[s.actionBtn, { backgroundColor: '#00C9B1', flex: 1 }]}
                            onPress={() => onQC(order)}
                            disabled={advancing}
                        >
                            {advancing
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <><ShieldCheck size={14} color="#fff" /><Text style={s.actionTxt}>Run QC Check</Text></>
                            }
                        </TouchableOpacity>
                    )}
                </View>
            )}
            {isCompleted && (
                <View style={[s.completedBadge]}>
                    <CheckCircle2 size={13} color="#00C9B1" />
                    <Text style={{ color: '#00C9B1', fontSize: 12, fontWeight: '700', marginLeft: 5 }}>Production Complete</Text>
                </View>
            )}
        </GCard>
    );
}

// ── Create order form ─────────────────────────────────────────────────────────
function CreateOrderForm({ onCreated }: { onCreated: () => void }) {
    const [show, setShow] = useState(false);
    const [productId, setProductId] = useState('P001');
    const [orderId, setOrderId] = useState('');
    const [qty, setQty] = useState('');
    const [loading, setLoading] = useState(false);

    const create = async () => {
        if (!productId || !orderId || !qty) {
            Alert.alert('Missing Fields', 'Please fill all fields.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API}/production/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    finished_product_id: productId,
                    order_id: orderId,
                    quantity: Number(qty),
                }),
            });
            const data = await res.json();
            if (data.status === 'SUCCESS' || data.production_id) {
                Alert.alert('✅ Created', `Production order created: ${data.production_id ?? ''}`);
                setShow(false);
                setOrderId('');
                setQty('');
                onCreated();
            } else {
                Alert.alert('Error', data.message || JSON.stringify(data));
            }
        } catch (e: any) {
            Alert.alert('Network Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!show) {
        return (
            <TouchableOpacity style={s.createBtn} onPress={() => setShow(true)}>
                <Plus size={16} color="#081021" />
                <Text style={s.createBtnTxt}>New Production Order</Text>
            </TouchableOpacity>
        );
    }

    return (
        <GCard>
            <Text style={s.formTitle}>New Production Order</Text>
            <TextInput style={s.input} placeholder="Product ID (e.g. P001)" placeholderTextColor="rgba(255,255,255,0.3)"
                value={productId} onChangeText={setProductId} />
            <TextInput style={s.input} placeholder="Order ID (e.g. ord-001)" placeholderTextColor="rgba(255,255,255,0.3)"
                value={orderId} onChangeText={setOrderId} />
            <TextInput style={s.input} placeholder="Quantity" placeholderTextColor="rgba(255,255,255,0.3)"
                value={qty} onChangeText={setQty} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setShow(false)}>
                    <Text style={[s.actionTxt, { color: 'rgba(255,255,255,0.6)' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { flex: 2, backgroundColor: '#00C9B1' }]} onPress={create} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.actionTxt}>Create Order</Text>}
                </TouchableOpacity>
            </View>
        </GCard>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function ProductionScreen() {
    const insets = useSafeAreaInsets();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [advancingId, setAdvancingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetch(`${API}/production/orders`);
            const data = await res.json();
            setOrders(Array.isArray(data) ? [...data].reverse() : []);
        } catch (e) {
            console.warn('[Production]', e);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, []);

    const advanceStage = async (order: any) => {
        const stageMap: Record<string, string> = {
            CREATED: 'material-issued',
            MATERIAL_ISSUED: 'fabrication',
            FABRICATION: 'assembly',
            ASSEMBLY: 'painting',
        };
        const endpoint = stageMap[order.current_stage];
        if (!endpoint) return;

        setAdvancingId(order.production_id);
        try {
            const res = await fetch(`${API}/production/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ production_id: order.production_id }),
            });
            const data = await res.json();
            if (data.status === 'SUCCESS' || data.production_id) {
                await load();
            } else {
                Alert.alert('Error', data.message || JSON.stringify(data));
            }
        } catch (e: any) {
            Alert.alert('Network Error', e.message);
        } finally {
            setAdvancingId(null);
        }
    };

    const runQC = async (order: any) => {
        setAdvancingId(order.production_id);
        try {
            const res = await fetch(`${API}/production/quality-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ production_id: order.production_id }),
            });
            const data = await res.json();
            const status = data.qc_status ?? data.status ?? 'UNKNOWN';
            const suggestions = data.llm_suggestions ?? data.suggestions ?? '';
            Alert.alert(
                status === 'PASSED' ? '✅ QC Passed' : '❌ QC Failed',
                typeof suggestions === 'string'
                    ? suggestions.slice(0, 300)
                    : JSON.stringify(suggestions).slice(0, 300),
            );
            await load();
        } catch (e: any) {
            Alert.alert('Network Error', e.message);
        } finally {
            setAdvancingId(null);
        }
    };

    const inProgress = orders.filter(o => o.status === 'IN_PROGRESS').length;
    const completed = orders.filter(o => o.status === 'COMPLETED').length;
    const created = orders.filter(o => o.status === 'CREATED').length;

    return (
        <View style={{ flex: 1, backgroundColor: '#081021' }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={[s.header, { paddingTop: insets.top + 10 }]}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={s.headerInner}>
                    <View style={s.headerLeft}>
                        <View style={s.headerIconBox}>
                            <Factory size={16} color="#FF8C00" />
                        </View>
                        <View>
                            <Text style={s.headerTitle}>Production</Text>
                            <View style={s.headerSubRow}>
                                <View style={s.onlineDot} />
                                <Text style={s.headerSub}>PRODUCTION CONTROL</Text>
                            </View>
                        </View>
                    </View>
                    <View style={s.statsBadge}>
                        <Zap size={13} color="#FF8C00" />
                        <Text style={s.statsBadgeTxt}>{inProgress} Active</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[s.scroll, { paddingBottom: 74 + insets.bottom + 16 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#FF8C00" />}
            >
                {/* Summary row */}
                <View style={s.summaryRow}>
                    {[
                        { label: 'Pending', value: created, color: '#58a6ff' },
                        { label: 'In Progress', value: inProgress, color: '#FF8C00' },
                        { label: 'Completed', value: completed, color: '#00C9B1' },
                    ].map(({ label, value, color }) => (
                        <View key={label} style={[s.summaryCard, { borderColor: color + '33' }]}>
                            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                            <Text style={[s.summaryNum, { color }]}>{value}</Text>
                            <Text style={s.summaryLabel}>{label}</Text>
                        </View>
                    ))}
                </View>

                {/* Create order form */}
                <CreateOrderForm onCreated={load} />

                {/* Order list */}
                {loading
                    ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#FF8C00" />
                    : orders.length === 0
                        ? (
                            <View style={s.emptyState}>
                                <Package size={40} color="rgba(255,255,255,0.15)" />
                                <Text style={s.emptyTxt}>No production orders</Text>
                            </View>
                        )
                        : orders.map((order) => (
                            <OrderCard
                                key={order.production_id}
                                order={order}
                                onAdvance={advanceStage}
                                onQC={runQC}
                                advancing={advancingId === order.production_id}
                            />
                        ))
                }
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    header: {
        overflow: 'hidden',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.07)',
    },
    headerInner: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 14,
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
    headerSub: { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, fontWeight: '700' },
    statsBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,140,0,0.12)',
        borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)',
        borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
    },
    statsBadgeTxt: { fontSize: 12, fontWeight: '800', color: '#FF8C00' },

    scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    summaryCard: {
        flex: 1, borderRadius: 14, overflow: 'hidden',
        borderWidth: 1, padding: 14, alignItems: 'center',
    },
    summaryNum: { fontSize: 22, fontWeight: '900' },
    summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, fontWeight: '600' },

    card: {
        borderRadius: 18, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 0,
    },
    cardInner: { padding: 16 },

    iconBox: {
        width: 38, height: 38, borderRadius: 10,
        borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },
    orderId: { fontSize: 14, fontWeight: '800', color: '#fff' },
    sub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 },

    pill: {
        borderRadius: 10, borderWidth: 1,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    pillTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    stageRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 10, paddingHorizontal: 4 },
    stageDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
    stageLine: {
        position: 'absolute', top: 4, left: '100%',
        width: '100%', height: 2,
    },
    stageLabel: { fontSize: 8, marginTop: 4, textAlign: 'center', fontWeight: '600' },

    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, gap: 5,
    },
    actionTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

    completedBadge: {
        flexDirection: 'row', alignItems: 'center', marginTop: 10,
        backgroundColor: 'rgba(0,201,177,0.1)', borderRadius: 8,
        padding: 8, borderWidth: 1, borderColor: 'rgba(0,201,177,0.2)',
    },

    createBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#00C9B1', borderRadius: 14, paddingVertical: 13,
        gap: 8, marginBottom: 4,
    },
    createBtnTxt: { color: '#081021', fontWeight: '800', fontSize: 14 },

    formTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 12 },
    input: {
        backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
        color: '#fff', paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 14, marginBottom: 8,
    },

    emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
});
