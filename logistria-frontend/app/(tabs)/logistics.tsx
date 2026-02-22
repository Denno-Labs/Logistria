import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import {
    Truck,
    Cpu,
    CheckCircle2,
    MapPin,
    Package,
    RefreshCw,
    ChevronRight,
    AlertTriangle,
    Zap,
    Navigation,
    Clock,
} from 'lucide-react-native';
import { BASE_URL } from '@/constants/api';
import RouteMapView from '@/components/RouteMapView';

// ── Static orders list (mirrors the HTML chips) ────────────────────────────
const ORDERS = [
    { id: 'O001', label: 'Raj Electronics', qty: 15 },
    { id: 'O002', label: 'Priya Stores', qty: 8 },
    { id: 'O003', label: 'Kumar Mart', qty: 20 },
    { id: 'O004', label: 'Anjali Traders', qty: 12 },
    { id: 'O005', label: 'Deepak Enterprises', qty: 5 },
    { id: 'O006', label: 'Sunita Retail', qty: 30 },
    { id: 'O007', label: 'Mehta Goods', qty: 18 },
    { id: 'O008', label: 'Sharma Supplies', qty: 7 },
];

// ── Types ──────────────────────────────────────────────────────────────────
interface RouteStop {
    name: string;
    lat: number;
    lng: number;
    weather?: { condition?: string; temp_c?: number; risk?: string };
}

interface PlanResult {
    shipment_id: string;
    delivery_pin: string;
    cluster_id: string;
    vehicle_id: string;
    stops: number;
    total_distance_km: number;
    delivery_mode: string;
    route_order: RouteStop[];
    reasoning: string[];
    orchestration_log_id?: string;
}

interface Shipment {
    shipment_id: string;
    cluster_id: string;
    vehicle_id: string;
    delivery_pin: string;
    status: 'IN_TRANSIT' | 'DELIVERED' | 'INCIDENT';
    created_at?: string;
    delivered_at?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function riskColor(risk?: string) {
    if (risk === 'HIGH' || risk === 'CRITICAL') return '#f87171';
    if (risk === 'MEDIUM') return '#fbbf24';
    return '#4ade80';
}

function statusColor(status: string) {
    if (status === 'DELIVERED') return '#4ade80';
    if (status === 'INCIDENT') return '#f87171';
    return '#58a6ff';
}

function modeColor(mode?: string) {
    const m = (mode || '').toLowerCase();
    if (m === 'express') return '#f87171';
    if (m === 'economic') return '#4ade80';
    return '#fbbf24';
}

// ══════════════════════════════════════════════════════════════════════════
// PLAN SECTION
// ══════════════════════════════════════════════════════════════════════════
function PlanSection() {
    const [selected, setSelected] = useState<Set<string>>(new Set(['O001', 'O002', 'O003']));
    const [loading, setLoading] = useState(false);
    const [planResult, setPlanResult] = useState<PlanResult | null>(null);
    const [error, setError] = useState('');
    const [dispatched, setDispatched] = useState(false);

    const toggleOrder = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const totalQty = ORDERS.filter((o) => selected.has(o.id)).reduce((s, o) => s + o.qty, 0);

    const plan = async () => {
        if (!selected.size) { Alert.alert('Select Orders', 'Pick at least one order to plan.'); return; }
        setLoading(true);
        setError('');
        setPlanResult(null);
        setDispatched(false);
        try {
            const res = await fetch(`${BASE_URL}/logistics/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders: [...selected] }),
            });
            const data = await res.json();
            if (!res.ok || data.error) { setError(data.error || 'Unknown error'); return; }
            setPlanResult(data);
        } catch (e: any) {
            setError(e.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const approveDispatch = () => {
        Alert.alert(
            '✅ Approve for Dispatch',
            `Confirm dispatch of shipment ${planResult?.shipment_id}?\nVehicle: ${planResult?.vehicle_id}\nPIN: ${planResult?.delivery_pin}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Dispatch',
                    style: 'default',
                    onPress: () => setDispatched(true),
                },
            ]
        );
    };

    return (
        <View>
            {/* Header */}
            <View style={s.sectionHeader}>
                <View style={s.sectionIconBox}>
                    <Cpu size={16} color="#FF8C00" />
                </View>
                <View>
                    <Text style={s.sectionTitle}>Autonomous Logistics Planner</Text>
                    <Text style={s.sectionSub}>AI clusters orders, selects vehicle & optimises route</Text>
                </View>
            </View>

            {/* Order chips */}
            <View style={s.card}>
                <Text style={s.cardTitle}>📦 Select Delivery Orders</Text>
                <View style={s.chipWrap}>
                    {ORDERS.map((o) => {
                        const active = selected.has(o.id);
                        return (
                            <TouchableOpacity
                                key={o.id}
                                onPress={() => toggleOrder(o.id)}
                                activeOpacity={0.75}
                                style={[s.chip, active && s.chipActive]}
                            >
                                <Text style={[s.chipText, active && s.chipTextActive]}>
                                    {o.id} · {o.label} ({o.qty})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={s.chipSummaryRow}>
                    <Text style={s.chipSummaryLabel}>Selected: </Text>
                    <Text style={s.chipSummaryVal}>{[...selected].join(', ') || 'None'}</Text>
                    <Text style={s.chipSummaryLabel}>  ·  Qty: </Text>
                    <Text style={[s.chipSummaryVal, { color: '#4ade80' }]}>{totalQty}</Text>
                </View>

                <TouchableOpacity
                    onPress={plan}
                    disabled={loading}
                    activeOpacity={0.82}
                    style={[s.planBtn, loading && { opacity: 0.65 }]}
                >
                    {loading
                        ? <ActivityIndicator color="#081021" size="small" />
                        : <><Zap size={15} color="#081021" fill="#081021" /><Text style={s.planBtnText}>PLAN LOGISTICS</Text></>}
                </TouchableOpacity>

                {loading && (
                    <Text style={s.loadingMsg}>🧠 Running AI pipeline: clustering → route → weather → PIN…</Text>
                )}
            </View>

            {/* Error */}
            {!!error && (
                <View style={s.errorCard}>
                    <AlertTriangle size={14} color="#f85149" />
                    <Text style={s.errorText}>{error}</Text>
                </View>
            )}

            {/* Plan Result */}
            {planResult && (
                <View>
                    {/* Delivery PIN */}
                    <View style={[s.card, { borderColor: 'rgba(63,185,80,0.35)' }]}>
                        <Text style={s.cardTitle}>🔑 Delivery PIN — Share with Driver</Text>
                        <View style={s.pinBox}>
                            <View>
                                <Text style={s.pinLabel}>4-DIGIT DELIVERY PIN</Text>
                                <Text style={s.pinDigits}>{planResult.delivery_pin}</Text>
                            </View>
                            <Text style={s.pinHint}>Driver shows this PIN to customer. Customer reads it back.</Text>
                        </View>
                        <Text style={s.shipIdRow}>
                            Shipment ID: <Text style={s.shipIdVal}>{planResult.shipment_id}</Text>
                        </Text>
                        <Text style={s.pinWarning}>⚠ Keep this PIN confidential until delivery.</Text>
                    </View>

                    {/* Plan Summary */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>✅ Plan Summary</Text>
                        <View style={s.summaryGrid}>
                            {[
                                { label: 'Cluster', val: planResult.cluster_id },
                                { label: 'Vehicle', val: planResult.vehicle_id },
                                { label: 'Stops', val: String(planResult.stops) },
                                { label: 'Distance', val: `${planResult.total_distance_km} km` },
                            ].map(({ label, val }) => (
                                <View key={label} style={s.statBox}>
                                    <Text style={s.statLabel}>{label}</Text>
                                    <Text style={s.statVal}>{val}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={s.modeRow}>
                            <Text style={s.modeLbl}>Delivery Mode: </Text>
                            <View style={[s.modeBadge, { borderColor: modeColor(planResult.delivery_mode) + '55' }]}>
                                <Text style={[s.modeBadgeText, { color: modeColor(planResult.delivery_mode) }]}>
                                    {planResult.delivery_mode}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Optimised Route */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>🗺️ Optimised Route</Text>
                        {[
                            { name: '🏭 Warehouse (Start)', lat: 12.9716, lng: 77.5946 },
                            ...planResult.route_order,
                        ].map((stop, i) => (
                            <View key={i} style={[s.stopRow, i > 0 && s.stopRowBorder]}>
                                <View style={s.stopNum}>
                                    <Text style={s.stopNumText}>{i === 0 ? '🏁' : String(i)}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.stopName}>{stop.name}</Text>
                                    <Text style={s.stopCoord}>
                                        {Number(stop.lat).toFixed(4)}°N · {Number(stop.lng).toFixed(4)}°E
                                    </Text>
                                </View>
                                {stop.weather && (
                                    <View style={[s.weatherPill, { borderColor: riskColor(stop.weather.risk) + '44' }]}>
                                        <Text style={[s.weatherText, { color: riskColor(stop.weather.risk) }]}>
                                            {stop.weather.condition ?? '?'} {stop.weather.temp_c != null ? `${stop.weather.temp_c}°C` : ''}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* LLM Reasoning */}
                    <View style={[s.card, { borderColor: 'rgba(168,85,247,0.25)' }]}>
                        <Text style={s.cardTitle}>🧠 LLM Reasoning</Text>
                        {(planResult.reasoning || ['No reasoning available.']).map((r, i) => (
                            <View key={i} style={s.reasoningItem}>
                                <Text style={s.reasoningBullet}>✦</Text>
                                <Text style={s.reasoningText}>{r}</Text>
                            </View>
                        ))}
                    </View>

                    {/* 🗺 Interactive Leaflet Map with clustering + route */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>🗺️ Interactive Route Map</Text>
                        <Text style={s.sectionSub} numberOfLines={1}>Clustered stops · dashed route · tap to open in Google Maps</Text>
                        <View style={{ height: 12 }} />
                        <RouteMapView
                            warehouse={{ lat: 12.9716, lng: 77.5946, name: '🏭 Warehouse' }}
                            stops={planResult.route_order}
                            height={300}
                        />
                    </View>

                    {/* Orchestration Log */}
                    <View style={[s.card, { borderColor: 'rgba(88,166,255,0.2)' }]}>
                        <Text style={s.cardTitle}>📝 Orchestration Log</Text>
                        <Text style={s.logSub}>Saved to <Text style={{ color: '#58a6ff' }}>data_base/logistics_log.csv</Text></Text>
                        <View style={s.logBadge}>
                            <Text style={s.logBadgeText}>🔖 {planResult.orchestration_log_id ?? '—'}</Text>
                        </View>
                    </View>

                    {/* ── Approve / Dispatch ── */}
                    {!dispatched ? (
                        <TouchableOpacity onPress={approveDispatch} activeOpacity={0.82} style={s.dispatchBtn}>
                            <View style={s.dispatchBtnGlow} />
                            <View style={s.dispatchBtnInner}>
                                <CheckCircle2 size={17} color="#081021" fill="#081021" />
                                <Text style={s.dispatchBtnText}>APPROVE & READY FOR DISPATCH</Text>
                                <ChevronRight size={16} color="#081021" strokeWidth={2.5} />
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={s.dispatchedBanner}>
                            <CheckCircle2 size={18} color="#4ade80" />
                            <Text style={s.dispatchedText}>Shipment {planResult.shipment_id} approved and ready for dispatch!</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════
// SHIPMENTS SECTION
// ══════════════════════════════════════════════════════════════════════════
function ShipmentsSection() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async (isRefresh = false) => {
        isRefresh ? setRefreshing(true) : setLoading(true);
        setError('');
        try {
            const res = await fetch(`${BASE_URL}/logistics/shipments`);
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to load'); return; }
            setShipments([...data].reverse());
        } catch (e: any) {
            setError(e.message || 'Network error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <View>
            <View style={s.sectionHeader}>
                <View style={[s.sectionIconBox, { backgroundColor: 'rgba(0,201,177,0.12)', borderColor: 'rgba(0,201,177,0.3)' }]}>
                    <Package size={16} color="#00C9B1" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.sectionTitle}>All Shipments</Text>
                    <Text style={s.sectionSub}>Live view of all delivery shipments</Text>
                </View>
                <TouchableOpacity onPress={() => load(true)} style={s.refreshBtn}>
                    <RefreshCw size={14} color="#00C9B1" />
                </TouchableOpacity>
            </View>

            {loading && !refreshing && (
                <View style={s.centerBox}>
                    <ActivityIndicator color="#00C9B1" />
                    <Text style={s.loadingMsg}>Loading shipments…</Text>
                </View>
            )}

            {!!error && (
                <View style={s.errorCard}>
                    <AlertTriangle size={14} color="#f85149" />
                    <Text style={s.errorText}>{error}</Text>
                </View>
            )}

            {!loading && !error && shipments.length === 0 && (
                <View style={s.emptyBox}>
                    <Truck size={28} color="rgba(255,255,255,0.15)" />
                    <Text style={s.emptyText}>No shipments yet. Plan a delivery above.</Text>
                </View>
            )}

            {shipments.map((sh) => (
                <View key={sh.shipment_id} style={s.shipCard}>
                    <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={s.shipCardInner}>
                        <View style={s.shipCardTop}>
                            <Text style={[s.shipId, { color: '#58a6ff' }]}>{sh.shipment_id}</Text>
                            <View style={[s.statusPill, { borderColor: statusColor(sh.status) + '44' }]}>
                                <View style={[s.statusDot, { backgroundColor: statusColor(sh.status) }]} />
                                <Text style={[s.statusText, { color: statusColor(sh.status) }]}>{sh.status}</Text>
                            </View>
                        </View>
                        <View style={s.shipMeta}>
                            <View style={s.shipMetaItem}>
                                <Truck size={11} color="rgba(255,255,255,0.35)" />
                                <Text style={s.shipMetaText}>{sh.vehicle_id}</Text>
                            </View>
                            <View style={s.shipMetaItem}>
                                <Navigation size={11} color="rgba(255,255,255,0.35)" />
                                <Text style={s.shipMetaText}>Cluster {sh.cluster_id}</Text>
                            </View>
                            <View style={s.shipMetaItem}>
                                <Clock size={11} color="rgba(255,255,255,0.35)" />
                                <Text style={s.shipMetaText}>{sh.created_at ?? '—'}</Text>
                            </View>
                        </View>
                        <View style={s.pinRow}>
                            <Text style={s.pinRowLabel}>PIN</Text>
                            <Text style={s.pinRowVal}>{sh.delivery_pin}</Text>
                            {sh.delivered_at && (
                                <Text style={s.deliveredAt}>Delivered: {sh.delivered_at}</Text>
                            )}
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT SCREEN
// ══════════════════════════════════════════════════════════════════════════
export default function LogisticsScreen() {
    const insets = useSafeAreaInsets();
    const [tab, setTab] = useState<'plan' | 'shipments'>('plan');

    return (
        <View style={[s.root]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Background glow accents */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={s.glowTR} />
                <View style={s.glowBL} />
            </View>

            {/* Top header */}
            <View style={[s.header, { paddingTop: insets.top + 16 }]}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={s.headerBadge}>
                    <Truck size={10} color="#FF8C00" />
                    <Text style={s.headerBadgeText}>LOGISTICS OFFICER</Text>
                </View>
                <Text style={s.headerTitle}>LOGISTRIA</Text>
                <Text style={s.headerSub}>AUTONOMOUS DELIVERY CONTROL</Text>
            </View>

            {/* Tab switcher */}
            <View style={s.tabBar}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                {(['plan', 'shipments'] as const).map((t) => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => setTab(t)}
                        style={[s.tabBtn, tab === t && s.tabBtnActive]}
                        activeOpacity={0.8}
                    >
                        <Text style={[s.tabBtnText, tab === t && s.tabBtnTextActive]}>
                            {t === 'plan' ? '🧠 Plan' : '📦 Shipments'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={[
                    s.scroll,
                    { paddingBottom: 74 + insets.bottom + 16 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {tab === 'plan' ? <PlanSection /> : <ShipmentsSection />}
            </ScrollView>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#081021' },
    glowTR: { position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: '#FF8C00', opacity: 0.05 },
    glowBL: { position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#00C9B1', opacity: 0.04 },

    // Header
    header: { overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 20, paddingBottom: 16 },
    headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,140,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
    headerBadgeText: { fontFamily: 'SpaceMono', fontSize: 8, color: '#FF8C00', letterSpacing: 2.5 },
    headerTitle: { fontFamily: 'SpaceMono', fontSize: 26, fontWeight: '900', color: '#FF8C00', letterSpacing: 6 },
    headerSub: { fontFamily: 'SpaceMono', fontSize: 7, color: '#00C9B1', letterSpacing: 3, marginTop: 4 },

    // Tabs
    tabBar: { flexDirection: 'row', overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center' },
    tabBtnActive: { borderColor: '#FF8C00', backgroundColor: 'rgba(255,140,0,0.1)' },
    tabBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
    tabBtnTextActive: { color: '#FF8C00' },

    scroll: { paddingHorizontal: 16, paddingTop: 16 },

    // Section
    sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    sectionIconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,140,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.25)', alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    sectionSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

    // Card
    card: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.025)', padding: 18, marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },

    // Order chips
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(88,166,255,0.25)', backgroundColor: 'rgba(88,166,255,0.07)' },
    chipActive: { borderColor: '#58a6ff', backgroundColor: 'rgba(88,166,255,0.18)' },
    chipText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
    chipTextActive: { color: '#FFFFFF' },
    chipSummaryRow: { flexDirection: 'row', marginBottom: 14 },
    chipSummaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
    chipSummaryVal: { fontSize: 11, fontWeight: '700', color: '#58a6ff' },

    // Plan button
    planBtn: { height: 52, borderRadius: 14, backgroundColor: '#FF8C00', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,200,80,0.4)', shadowColor: '#FF8C00', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 },
    planBtnText: { fontSize: 12, fontWeight: '900', color: '#081021', fontFamily: 'SpaceMono', letterSpacing: 1.5 },
    loadingMsg: { fontSize: 11, color: '#a855f7', marginTop: 10, textAlign: 'center' },

    // Error
    errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(248,81,73,0.35)', backgroundColor: 'rgba(40,16,14,0.6)', padding: 14, marginBottom: 12 },
    errorText: { flex: 1, fontSize: 12, color: '#ffa198' },

    // PIN
    pinBox: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(63,185,80,0.07)', borderWidth: 1, borderColor: 'rgba(63,185,80,0.3)', borderRadius: 12, padding: 14, marginBottom: 10 },
    pinLabel: { fontFamily: 'SpaceMono', fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginBottom: 4 },
    pinDigits: { fontFamily: 'SpaceMono', fontSize: 34, fontWeight: '900', color: '#3fb950', letterSpacing: 8 },
    pinHint: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 16 },
    pinWarning: { fontSize: 11, color: '#d29922', marginTop: 6 },
    shipIdRow: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
    shipIdVal: { fontFamily: 'SpaceMono', color: '#58a6ff' },

    // Summary grid
    summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    statBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 12, alignItems: 'center' },
    statLabel: { fontFamily: 'SpaceMono', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 5, textTransform: 'uppercase' },
    statVal: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    modeRow: { flexDirection: 'row', alignItems: 'center' },
    modeLbl: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
    modeBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
    modeBadgeText: { fontSize: 11, fontWeight: '700' },

    // Route stops
    stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    stopRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    stopNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(88,166,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    stopNumText: { fontSize: 10, fontWeight: '700', color: '#58a6ff' },
    stopName: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
    stopCoord: { fontFamily: 'SpaceMono', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
    weatherPill: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    weatherText: { fontSize: 10, fontWeight: '600' },

    // Reasoning
    reasoningItem: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(168,85,247,0.07)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.15)', borderRadius: 10, padding: 10, marginBottom: 7 },
    reasoningBullet: { color: '#a855f7', fontSize: 12, marginTop: 1 },
    reasoningText: { flex: 1, fontSize: 12, color: '#d0b3ff', lineHeight: 18 },

    // Log
    logSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10 },
    logBadge: { backgroundColor: 'rgba(88,166,255,0.07)', borderWidth: 1, borderColor: 'rgba(88,166,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    logBadgeText: { fontFamily: 'SpaceMono', fontSize: 11, color: '#58a6ff' },

    // Dispatch button
    dispatchBtn: { position: 'relative', alignItems: 'center', marginTop: 4, marginBottom: 16 },
    dispatchBtnGlow: { position: 'absolute', top: 4, left: 20, right: 20, height: 46, borderRadius: 28, backgroundColor: '#00C9B1', opacity: 0.28, shadowColor: '#00C9B1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 20 },
    dispatchBtnInner: { width: '100%', height: 54, borderRadius: 16, backgroundColor: '#00C9B1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(100,255,240,0.4)', shadowColor: '#00C9B1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 10 },
    dispatchBtnText: { fontSize: 11, fontWeight: '900', color: '#081021', fontFamily: 'SpaceMono', letterSpacing: 1.5 },

    // Dispatched banner
    dispatchedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(63,185,80,0.35)', backgroundColor: 'rgba(10,40,15,0.6)', padding: 14, marginBottom: 16 },
    dispatchedText: { flex: 1, fontSize: 13, color: '#4ade80', fontWeight: '600' },

    // Shipments
    centerBox: { alignItems: 'center', paddingVertical: 24, gap: 10 },
    emptyBox: { alignItems: 'center', paddingVertical: 36, gap: 10 },
    emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
    refreshBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(0,201,177,0.1)', borderWidth: 1, borderColor: 'rgba(0,201,177,0.25)', alignItems: 'center', justifyContent: 'center' },
    shipCard: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden', marginBottom: 10 },
    shipCardInner: { padding: 14 },
    shipCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    shipId: { fontFamily: 'SpaceMono', fontSize: 12 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: 'SpaceMono', fontSize: 9, fontWeight: '700' },
    shipMeta: { flexDirection: 'row', gap: 16, marginBottom: 10 },
    shipMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    shipMetaText: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
    pinRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 10 },
    pinRowLabel: { fontFamily: 'SpaceMono', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 },
    pinRowVal: { fontFamily: 'SpaceMono', fontSize: 18, color: '#4ade80', letterSpacing: 6, fontWeight: '700' },
    deliveredAt: { fontSize: 10, color: '#4ade80', marginLeft: 'auto' },
});
