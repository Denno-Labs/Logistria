import { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, StatusBar,
    TouchableOpacity, RefreshControl, ActivityIndicator, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import {
    Warehouse, AlertTriangle, Package, TrendingUp,
    Activity, Boxes, Factory, ShieldCheck, Brain,
    Zap, RotateCcw, Truck, Shield,
} from 'lucide-react-native';
import { BASE_URL } from '@/constants/api';

const API = BASE_URL;

const S_COLOR: Record<string, string> = {
    CRITICAL: '#FF3B3B', WARNING: '#FF8C00', NORMAL: '#00C9B1',
    OPTIMAL: '#00C9B1', MODERATE: '#FF8C00', AT_RISK: '#FF3B3B',
    HIGH: '#FF3B3B', MEDIUM: '#FF8C00', LOW: '#00C9B1',
};
const f = (n?: number | null) => (n == null ? '—' : n.toLocaleString());

// ─── Reusable Glass Card ──────────────────────────────────────────
const GCard = ({ children, accent }: { children: React.ReactNode; accent?: string }) => (
    <View style={[s.card, accent ? { borderColor: accent + '33' } : null]}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={s.cardInner}>{children}</View>
    </View>
);

// ─── Capacity Bar ─────────────────────────────────────────────────
function CapBar({ wh }: { wh: any }) {
    const anim = useRef(new Animated.Value(0)).current;
    const col = S_COLOR[wh.status] ?? '#00C9B1';
    useEffect(() => {
        Animated.timing(anim, { toValue: Math.min(wh.utilization_pct, 100), duration: 800, useNativeDriver: false }).start();
    }, [wh.utilization_pct]);
    return (
        <GCard accent={col}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={[s.iconBox, { backgroundColor: col + '18', borderColor: col + '35' }]}>
                    <Warehouse size={15} color={col} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.whId}>{wh.warehouse_id}</Text>
                    <Text style={s.sub}>Max: {f(wh.max_capacity)} units</Text>
                </View>
                <View style={[s.pill, { backgroundColor: col + '18', borderColor: col + '44' }]}>
                    <Text style={[s.pillTxt, { color: col }]}>{wh.status}</Text>
                </View>
            </View>
            <Text style={[s.bigPct, { color: col }]}>{wh.utilization_pct}%</Text>
            <View style={s.track}>
                <Animated.View style={[s.fill, { width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) as any, backgroundColor: col }]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
                <View><Text style={{ fontSize: 15, fontWeight: '800', color: '#FF8C00' }}>{f(wh.occupied)}</Text><Text style={s.sub}>Occupied</Text></View>
                <View><Text style={{ fontSize: 15, fontWeight: '800', color: '#00C9B1' }}>{f(wh.free)}</Text><Text style={s.sub}>Free</Text></View>
            </View>
            {wh.alert && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: 'rgba(255,59,59,0.08)', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: 'rgba(255,59,59,0.2)' }}>
                    <AlertTriangle size={11} color="#FF3B3B" />
                    <Text style={{ fontSize: 11, color: '#FFA198', flex: 1 }}>Approaching capacity — action required</Text>
                </View>
            )}
        </GCard>
    );
}

// ─── Severity Badge ───────────────────────────────────────────────
function SeverityBadge({ level }: { level: string }) {
    const col = S_COLOR[level?.toUpperCase()] ?? '#FF8C00';
    return (
        <View style={[s.pill, { backgroundColor: col + '18', borderColor: col + '44' }]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: col }} />
            <Text style={[s.pillTxt, { color: col, fontSize: 8 }]}>{level?.toUpperCase()}</Text>
        </View>
    );
}

// ═══════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════
export default function WarehouseScreen() {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'overview' | 'inventory' | 'wip' | 'agent'>('overview');
    const [cap, setCap] = useState<any>(null);
    const [inv, setInv] = useState<any>(null);
    const [fgi, setFgi] = useState<any>(null);
    const [wip, setWip] = useState<any>(null);
    const [ins, setIns] = useState<any>(null);

    // AI Agent state
    const [agentResult, setAgentResult] = useState<any>(null);
    const [agentLoading, setAgentLoading] = useState(false);
    const [agentAction, setAgentAction] = useState<string>('');

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const [cr, ir, fr, wr, isr] = await Promise.all([
                fetch(`${API}/warehouse/capacity`), fetch(`${API}/warehouse/inventory`),
                fetch(`${API}/warehouse/finished-goods`), fetch(`${API}/warehouse/wip`),
                fetch(`${API}/warehouse/insights`),
            ]);
            const [cd, id, fd, wd, isd] = await Promise.all([cr.json(), ir.json(), fr.json(), wr.json(), isr.json()]);
            setCap(cd); setInv(id); setFgi(fd); setWip(wd); setIns(isd);
        } catch (e) { console.warn('[Warehouse]', e); }
        finally { setRefreshing(false); setLoading(false); }
    }, []);

    useEffect(() => { load(); }, []);

    // ── AI Agent Actions ──────────────────────────────
    const callAgent = useCallback(async (action: 'analyze' | 'allocate' | 'reorder') => {
        setAgentLoading(true);
        setAgentAction(action);
        setAgentResult(null);
        try {
            let res;
            if (action === 'analyze') {
                res = await fetch(`${API}/warehouse/agent/analyze`, { method: 'POST' });
            } else if (action === 'allocate') {
                res = await fetch(`${API}/warehouse/agent/allocate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });
            } else {
                res = await fetch(`${API}/warehouse/agent/reorder-check`);
            }
            const data = await res.json();
            setAgentResult(data);
        } catch (e) {
            setAgentResult({ error: String(e) });
        } finally {
            setAgentLoading(false);
        }
    }, []);

    const hCol = S_COLOR[ins?.health_status?.replace(' ', '_') ?? 'NORMAL'] ?? '#00C9B1';
    const TAB_H = 74 + insets.bottom;

    const TABS = [
        { k: 'overview', label: 'Overview', Icon: TrendingUp },
        { k: 'inventory', label: 'Inventory', Icon: Boxes },
        { k: 'wip', label: 'WIP', Icon: Factory },
        { k: 'agent', label: 'AI Agent', Icon: Brain },
    ] as const;

    return (
        <View style={{ flex: 1, backgroundColor: '#081021' }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <View style={[s.header, { paddingTop: insets.top + 10 }]}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 12 }}>
                    <View>
                        <View style={s.badge}><Activity size={10} color="#FF8C00" /><Text style={s.badgeTxt}>WAREHOUSE AGENT</Text></View>
                        <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF', lineHeight: 34 }}>{'Warehouse\nIntelligence'}</Text>
                    </View>
                    {ins && (
                        <View style={[s.pill, { backgroundColor: hCol + '18', borderColor: hCol + '44', paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 }]}>
                            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: hCol }} />
                            <Text style={[s.pillTxt, { color: hCol, fontSize: 10 }]}>{ins.health_status}</Text>
                        </View>
                    )}
                </View>
                {cap && (
                    <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 14 }}>
                        {[
                            { l: 'Capacity', v: f(cap.totals?.max_capacity), c: '#FFFFFF' },
                            { l: 'Occupied', v: f(cap.totals?.occupied), c: '#FF8C00' },
                            { l: 'Free', v: f(cap.totals?.free), c: '#00C9B1' },
                            { l: 'Used %', v: cap.totals?.utilization_pct + '%', c: hCol },
                        ].map(({ l, v, c }) => (
                            <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: c }}>{v}</Text>
                                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{l}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Inner tab bar */}
            <View style={s.tabBar}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                {TABS.map(({ k, label, Icon }) => (
                    <TouchableOpacity key={k} style={s.tabBtn} onPress={() => setTab(k as any)} activeOpacity={0.7}>
                        <Icon size={15} color={tab === k ? '#FF8C00' : '#64748B'} />
                        <Text style={[s.tabLbl, tab === k && { color: '#FF8C00' }]}>{label}</Text>
                        {tab === k && <View style={s.tabLine} />}
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                    <ActivityIndicator color="#FF8C00" size="large" />
                    <Text style={{ fontFamily: 'SpaceMono', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>LOADING WAREHOUSE DATA…</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: TAB_H + 24 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#FF8C00" />}
                >
                    {/* ═══ OVERVIEW ═══ */}
                    {tab === 'overview' && (
                        <>
                            <Text style={s.secLbl}>WAREHOUSE CAPACITY</Text>
                            {cap?.warehouses?.map((wh: any) => <CapBar key={wh.warehouse_id} wh={wh} />)}
                            {fgi && (
                                <>
                                    <Text style={s.secLbl}>FINISHED GOODS READY</Text>
                                    <GCard accent="#BC8CFF">
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                            <View style={[s.iconBox, { backgroundColor: 'rgba(188,140,255,0.1)', borderColor: 'rgba(188,140,255,0.25)' }]}>
                                                <Package size={14} color="#BC8CFF" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>Finished Goods</Text>
                                                <Text style={s.sub}>Ready for dispatch</Text>
                                            </View>
                                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#BC8CFF' }}>{f(fgi.total_stock)}</Text>
                                        </View>
                                        {fgi.items?.map((item: any, i: number) => (
                                            <View key={item.product_id} style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{item.product_id}</Text>
                                                <View style={{ backgroundColor: 'rgba(188,140,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                                                    <Text style={{ fontFamily: 'SpaceMono', fontSize: 10, color: '#BC8CFF' }}>{f(item.current_stock)} units</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </GCard>
                                </>
                            )}
                        </>
                    )}

                    {/* ═══ INVENTORY ═══ */}
                    {tab === 'inventory' && inv && (
                        <>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                {[
                                    { l: 'SKUs', v: inv.summary?.total_skus, c: '#FFFFFF' },
                                    { l: 'Total Stock', v: f(inv.summary?.total_stock), c: '#00C9B1' },
                                    { l: 'Reserved', v: f(inv.summary?.total_reserved), c: '#FF8C00' },
                                ].map(({ l, v, c }) => (
                                    <View key={l} style={s.summPill}>
                                        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
                                        <Text style={{ fontSize: 18, fontWeight: '800', color: c }}>{v}</Text>
                                        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{l}</Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={s.secLbl}>RAW INVENTORY</Text>
                            {inv.items?.map((item: any) => {
                                const pct = item.current_stock > 0 ? item.available_stock / item.current_stock : 0;
                                return (
                                    <GCard key={item.product_id} accent="#00C9B1">
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                            <View style={[s.iconBox, { backgroundColor: 'rgba(0,201,177,0.08)', borderColor: 'rgba(0,201,177,0.2)' }]}>
                                                <Package size={14} color="#00C9B1" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{item.product_id}</Text>
                                                    <View style={{ backgroundColor: 'rgba(188,140,255,0.1)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(188,140,255,0.25)', paddingHorizontal: 8, paddingVertical: 2 }}>
                                                        <Text style={{ fontSize: 10, color: '#BC8CFF', fontWeight: '700' }}>{item.warehouse_location}</Text>
                                                    </View>
                                                </View>
                                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                                                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Total: <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{f(item.current_stock)}</Text></Text>
                                                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Reserved: <Text style={{ color: '#FF8C00', fontWeight: '700' }}>{f(item.reserved_stock)}</Text></Text>
                                                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Available: <Text style={{ color: '#00C9B1', fontWeight: '700' }}>{f(item.available_stock)}</Text></Text>
                                                </View>
                                                <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
                                                    <View style={{ height: 3, borderRadius: 3, backgroundColor: '#00C9B1', width: `${Math.round(pct * 100)}%` as any }} />
                                                </View>
                                            </View>
                                        </View>
                                    </GCard>
                                );
                            })}
                        </>
                    )}

                    {/* ═══ WIP ═══ */}
                    {tab === 'wip' && wip && (
                        <>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                {[
                                    { l: 'Total', v: wip.summary?.total_productions, c: '#FFFFFF' },
                                    { l: 'In Progress', v: wip.summary?.in_progress, c: '#FF8C00' },
                                    { l: 'Completed', v: wip.summary?.completed, c: '#00C9B1' },
                                ].map(({ l, v, c }) => (
                                    <View key={l} style={s.summPill}>
                                        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
                                        <Text style={{ fontSize: 18, fontWeight: '800', color: c }}>{v}</Text>
                                        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{l}</Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={s.secLbl}>PRODUCTION ORDERS</Text>
                            {(!wip.productions || wip.productions.length === 0) ? (
                                <GCard><View style={{ alignItems: 'center', padding: 24 }}><Factory size={28} color="#64748B" /><Text style={{ color: '#64748B', marginTop: 10, fontSize: 13 }}>No active production orders</Text></View></GCard>
                            ) : wip.productions.map((prod: any) => {
                                const isActive = prod.current_status === 'IN_PROGRESS';
                                const stC = isActive ? '#FF8C00' : '#00C9B1';
                                return (
                                    <GCard key={prod.production_id} accent={stC}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={[s.iconBox, { backgroundColor: stC + '15', borderColor: stC + '33' }]}>
                                                <Factory size={14} color={stC} />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>{prod.production_id}</Text>
                                                <Text style={s.sub}>{prod.current_stage}</Text>
                                            </View>
                                            <View style={[s.pill, { backgroundColor: stC + '18', borderColor: stC + '44' }]}>
                                                <Text style={[s.pillTxt, { color: stC, fontSize: 8 }]}>{prod.current_status}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                                            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{prod.stages_completed}/{prod.total_stages} stages</Text>
                                            <View style={[s.track, { flex: 1 }]}>
                                                <View style={[s.fill, { width: `${prod.progress_pct}%` as any, backgroundColor: stC }]} />
                                            </View>
                                            <Text style={{ fontSize: 11, color: stC, fontWeight: '700' }}>{prod.progress_pct}%</Text>
                                        </View>
                                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>Qty: {f(prod.quantity)} units</Text>
                                    </GCard>
                                );
                            })}
                        </>
                    )}

                    {/* ═══════════════════════════════════════
                         AI AGENT TAB — Gemini-Powered
                    ═══════════════════════════════════════ */}
                    {tab === 'agent' && (
                        <>
                            {/* Action Buttons */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                                {[
                                    { k: 'analyze', label: 'Full Analysis', Icon: Brain, col: '#BC8CFF' },
                                    { k: 'allocate', label: 'Allocate Orders', Icon: Truck, col: '#00C9B1' },
                                    { k: 'reorder', label: 'Reorder Check', Icon: RotateCcw, col: '#FF8C00' },
                                ].map(({ k, label, Icon, col }) => (
                                    <TouchableOpacity
                                        key={k}
                                        style={[s.agentBtn, { borderColor: col + '44', backgroundColor: agentAction === k && agentLoading ? col + '18' : 'rgba(255,255,255,0.03)' }]}
                                        onPress={() => callAgent(k as any)}
                                        disabled={agentLoading}
                                        activeOpacity={0.7}
                                    >
                                        {agentLoading && agentAction === k ? (
                                            <ActivityIndicator size="small" color={col} />
                                        ) : (
                                            <Icon size={16} color={col} />
                                        )}
                                        <Text style={{ fontSize: 9, color: col, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center', marginTop: 4 }}>{label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Loading State */}
                            {agentLoading && (
                                <GCard accent="#BC8CFF">
                                    <View style={{ alignItems: 'center', padding: 30, gap: 14 }}>
                                        <ActivityIndicator size="large" color="#BC8CFF" />
                                        <Text style={{ fontFamily: 'SpaceMono', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>GEMINI REASONING…</Text>
                                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                                            Computing state → Applying rules → AI strategic analysis
                                        </Text>
                                    </View>
                                </GCard>
                            )}

                            {/* Error */}
                            {agentResult?.error && (
                                <GCard accent="#FF3B3B">
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <AlertTriangle size={16} color="#FF3B3B" />
                                        <Text style={{ flex: 1, fontSize: 13, color: '#FFA198' }}>{agentResult.error}</Text>
                                    </View>
                                </GCard>
                            )}

                            {/* Agent Results */}
                            {agentResult && !agentResult.error && !agentLoading && (
                                <>
                                    {/* Request ID + Strategic Summary */}
                                    <GCard accent="#BC8CFF">
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                            <View style={[s.iconBox, { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(188,140,255,0.15)', borderColor: 'rgba(188,140,255,0.3)' }]}>
                                                <Brain size={18} color="#BC8CFF" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>AI Decision</Text>
                                                <Text style={{ fontFamily: 'SpaceMono', fontSize: 8, color: 'rgba(188,140,255,0.6)', letterSpacing: 1, marginTop: 2 }}>ID: {agentResult.request_id?.slice(0, 8)}…</Text>
                                            </View>
                                            <View style={[s.pill, { backgroundColor: 'rgba(188,140,255,0.12)', borderColor: 'rgba(188,140,255,0.3)' }]}>
                                                <Zap size={10} color="#BC8CFF" />
                                                <Text style={[s.pillTxt, { color: '#BC8CFF' }]}>LOGGED</Text>
                                            </View>
                                        </View>
                                        {agentResult.strategic_summary ? (
                                            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 22 }}>{agentResult.strategic_summary}</Text>
                                        ) : null}
                                    </GCard>

                                    {/* Allocation Plan */}
                                    {agentResult.allocation_plan?.length > 0 && (
                                        <>
                                            <Text style={s.secLbl}>📦 ALLOCATION PLAN</Text>
                                            {agentResult.allocation_plan.map((a: any, i: number) => (
                                                <GCard key={i} accent="#00C9B1">
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                        <View style={[s.iconBox, { backgroundColor: 'rgba(0,201,177,0.1)', borderColor: 'rgba(0,201,177,0.25)' }]}>
                                                            <Truck size={14} color="#00C9B1" />
                                                        </View>
                                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>{a.order_id}</Text>
                                                            <Text style={s.sub}>→ {a.warehouse_id} · {f(a.allocated_quantity)} units</Text>
                                                        </View>
                                                        {a.split && (
                                                            <View style={[s.pill, { backgroundColor: 'rgba(255,140,0,0.12)', borderColor: 'rgba(255,140,0,0.3)' }]}>
                                                                <Text style={[s.pillTxt, { color: '#FF8C00' }]}>SPLIT</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    {a.reasoning && (
                                                        <View style={{ backgroundColor: 'rgba(0,201,177,0.05)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(0,201,177,0.1)' }}>
                                                            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 18 }}>💡 {a.reasoning}</Text>
                                                        </View>
                                                    )}
                                                </GCard>
                                            ))}
                                        </>
                                    )}

                                    {/* Reorder Recommendations */}
                                    {agentResult.reorder_recommendations?.length > 0 && (
                                        <>
                                            <Text style={s.secLbl}>🔄 REORDER RECOMMENDATIONS</Text>
                                            {agentResult.reorder_recommendations.map((r: any, i: number) => (
                                                <GCard key={i} accent="#FF8C00">
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                        <View style={[s.iconBox, { backgroundColor: 'rgba(255,140,0,0.1)', borderColor: 'rgba(255,140,0,0.25)' }]}>
                                                            <RotateCcw size={14} color="#FF8C00" />
                                                        </View>
                                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>{r.material_id}</Text>
                                                            <Text style={s.sub}>Order: {f(r.recommended_quantity)} units</Text>
                                                        </View>
                                                        <SeverityBadge level={r.urgency_level || 'MEDIUM'} />
                                                    </View>
                                                    {r.reasoning && (
                                                        <View style={{ backgroundColor: 'rgba(255,140,0,0.05)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,140,0,0.1)' }}>
                                                            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 18 }}>💡 {r.reasoning}</Text>
                                                        </View>
                                                    )}
                                                </GCard>
                                            ))}
                                        </>
                                    )}

                                    {/* Capacity Alerts */}
                                    {agentResult.capacity_alerts?.length > 0 && (
                                        <>
                                            <Text style={s.secLbl}>⚡ CAPACITY ALERTS</Text>
                                            {agentResult.capacity_alerts.map((c: any, i: number) => (
                                                <GCard key={i} accent={S_COLOR[c.severity?.toUpperCase()] ?? '#FF8C00'}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                        <View style={[s.iconBox, { backgroundColor: 'rgba(255,140,0,0.1)', borderColor: 'rgba(255,140,0,0.25)' }]}>
                                                            <Warehouse size={14} color={S_COLOR[c.severity?.toUpperCase()] ?? '#FF8C00'} />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{c.warehouse_id} — {c.utilization_percent}%</Text>
                                                            <Text style={s.sub}>{c.action_suggested}</Text>
                                                        </View>
                                                        <SeverityBadge level={c.severity || 'WARNING'} />
                                                    </View>
                                                </GCard>
                                            ))}
                                        </>
                                    )}

                                    {/* Risk Alerts */}
                                    {agentResult.risk_alerts?.length > 0 && (
                                        <>
                                            <Text style={s.secLbl}>🛡 RISK ALERTS</Text>
                                            {agentResult.risk_alerts.map((r: any, i: number) => {
                                                const rCol = S_COLOR[r.severity?.toUpperCase()] ?? '#FF8C00';
                                                return (
                                                    <GCard key={i} accent={rCol}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                            <View style={[s.iconBox, { backgroundColor: rCol + '15', borderColor: rCol + '33' }]}>
                                                                <Shield size={14} color={rCol} />
                                                            </View>
                                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>{r.risk_type}</Text>
                                                                <Text style={s.sub}>{r.entity_id}</Text>
                                                            </View>
                                                            <SeverityBadge level={r.severity || 'MEDIUM'} />
                                                        </View>
                                                        {r.mitigation_strategy && (
                                                            <View style={{ backgroundColor: rCol + '08', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: rCol + '15' }}>
                                                                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 18 }}>🛡 {r.mitigation_strategy}</Text>
                                                            </View>
                                                        )}
                                                    </GCard>
                                                );
                                            })}
                                        </>
                                    )}
                                </>
                            )}

                            {/* Empty state if no result yet */}
                            {!agentResult && !agentLoading && (
                                <GCard>
                                    <View style={{ alignItems: 'center', padding: 32, gap: 12 }}>
                                        <Brain size={36} color="#64748B" />
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>AI Warehouse Agent</Text>
                                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 }}>
                                            Tap an action above to run the Gemini-powered agent.{'\n'}
                                            State → Rules → AI Reasoning → Decision
                                        </Text>
                                    </View>
                                </GCard>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    header: { overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,140,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
    badgeTxt: { fontFamily: 'SpaceMono', fontSize: 8, color: '#FF8C00', letterSpacing: 2 },
    pill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
    pillTxt: { fontFamily: 'SpaceMono', fontSize: 8, letterSpacing: 1, fontWeight: '700' },
    tabBar: { flexDirection: 'row', overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3, position: 'relative' },
    tabLbl: { fontSize: 9, color: '#64748B', fontWeight: '600', letterSpacing: 0.5 },
    tabLine: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, backgroundColor: '#FF8C00', borderRadius: 1 },
    card: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden', marginBottom: 12 },
    cardInner: { padding: 18 },
    iconBox: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    whId: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    sub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    bigPct: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
    track: { height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden', marginVertical: 8 },
    fill: { height: 6, borderRadius: 6 },
    secLbl: { fontFamily: 'SpaceMono', fontSize: 9, color: 'rgba(255,255,255,0.32)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, marginTop: 6 },
    summPill: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden', alignItems: 'center', paddingVertical: 14, gap: 4 },
    insRow: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, marginBottom: 8 },
    insDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5, flexShrink: 0 },
    insTxt: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
    agentBtn: { flex: 1, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 6 },
});
