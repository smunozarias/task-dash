import { useState, useMemo, useEffect } from 'react';
import { supabase } from './lib/supabase';
import {
    Upload,
    Users,
    Activity as ActivityIcon,
    BarChart2,
    PieChart as PieChartIcon,
    Calendar,
    Clock,
    ChevronDown,
    User,
    Zap,
    TrendingUp,
    Target,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
    ScatterChart,
    Scatter,
    ZAxis,
    ReferenceArea,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis
} from 'recharts';

// --- CONFIGURAÇÃO DA MARCA (TaskDash) ---
const BRAND_COLORS = {
    primary: '#6366f1', // Indigo Vibrante (Ação Principal)
    secondary: '#8b5cf6', // Roxo (Ação Secundária)
    accent: '#f97316', // Laranja (Destaques/Alertas)
    bg: '#0f172a', // Fundo Escuro Profundo
    surface: '#1e293b', // Cartões/Superfícies
    text: '#f8fafc',
    textMuted: '#94a3b8',
    chart: ['#6366f1', '#ec4899', '#f97316', '#10b981', '#3b82f6', '#8b5cf6']
};

// --- TIPAGEM ---
interface Activity {
    id: string;
    user: string;
    type: string;
    date: Date;
    hour: number;
    dateStr: string; // YYYY-MM-DD para agrupamento
}

interface UserMetrics {
    name: string;
    total: number;
    email: number;
    whatsapp: number;
    linkedin: number;
    call: number;
    activeDays: number;
    totalDaysInRange: number; // Para calcular Presença %
    avgHoursPerDay: number; // Média de amplitude horária (Max - Min)
    peakHour: number; // Hora de pico
    morningPercentage: number; // % de atividades antes das 12h
    afternoonPercentage: number; // % de atividades depois das 12h
    avgActivitiesPerDay: number;
}

interface DashboardData {
    totalActivities: number;
    dateRange: { start: Date | null, end: Date | null };
    userMetrics: UserMetrics[];
    activitiesByType: { name: string; value: number }[];
    heatmapData: { date: string; hour: number; value: number }[];
    dailyVolume: { date: string; count: number }[];
    uniqueDates: string[];
    rawActivities: Activity[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// --- PROCESSAMENTO DE DADOS ---
const processActivities = (activities: Activity[]): DashboardData => {
    const userMap: Record<string, any> = {};
    const userDailyHours: Record<string, Record<string, number[]>> = {}; // user -> date -> [hours]
    const typeMap: Record<string, number> = {};
    const heatmapMap: Record<string, number> = {}; // key: "YYYY-MM-DD-HOUR"
    const dailyMap: Record<string, number> = {}; // key: "YYYY-MM-DD"
    const uniqueDatesSet = new Set<string>();

    activities.forEach(act => {
        uniqueDatesSet.add(act.dateStr);

        // Métricas por Usuário
        if (!userMap[act.user]) {
            userMap[act.user] = { name: act.user, total: 0, email: 0, whatsapp: 0, linkedin: 0, call: 0 };
        }
        userMap[act.user].total++;

        const lowerType = act.type.toLowerCase();
        if (lowerType.includes('e-mail') || lowerType.includes('email')) userMap[act.user].email++;
        else if (lowerType.includes('whatsapp')) userMap[act.user].whatsapp++;
        else if (lowerType.includes('linkedin')) userMap[act.user].linkedin++;
        else if (lowerType.includes('chamada') || lowerType.includes('call')) userMap[act.user].call++;

        // Por Tipo
        typeMap[act.type] = (typeMap[act.type] || 0) + 1;

        // Heatmap (Dia Específico + Hora)
        const hmKey = `${act.dateStr}-${act.hour}`;
        heatmapMap[hmKey] = (heatmapMap[hmKey] || 0) + 1;

        // Tracking de horas para média diária
        if (!userDailyHours[act.user]) userDailyHours[act.user] = {};
        if (!userDailyHours[act.user][act.dateStr]) userDailyHours[act.user][act.dateStr] = [];
        userDailyHours[act.user][act.dateStr].push(act.hour);

        // Volume Diário
        dailyMap[act.dateStr] = (dailyMap[act.dateStr] || 0) + 1;
    });

    // Pós-processamento de métricas avançadas
    const totalDays = uniqueDatesSet.size;
    const userMetrics = Object.values(userMap).map((u: any) => {
        // Calcular dias ativos e média de horas
        const daysActive = Object.keys(userDailyHours[u.name] || {}).length;
        let totalHoursSpan = 0;

        // Stats de Horários
        const hourCounts: Record<number, number> = {};
        let morningCount = 0;
        let afternoonCount = 0;
        let totalActs = 0;

        Object.values(userDailyHours[u.name] || {}).forEach((hours: any) => {
            if (hours.length > 0) {
                const min = Math.min(...hours);
                const max = Math.max(...hours);
                totalHoursSpan += (max - min);

                // Contagem de horas individuais
                hours.forEach((h: number) => {
                    hourCounts[h] = (hourCounts[h] || 0) + 1;
                    if (h < 12) morningCount++;
                    else afternoonCount++;
                    totalActs++;
                });
            }
        });

        const avgHours = daysActive > 0 ? totalHoursSpan / daysActive : 0;
        const peakHour = Object.keys(hourCounts).length > 0
            ? Object.keys(hourCounts).reduce((a, b) => hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b)
            : "9";

        return {
            ...u,
            activeDays: daysActive,
            totalDaysInRange: totalDays,
            avgHoursPerDay: parseFloat(avgHours.toFixed(1)),
            peakHour: parseInt(peakHour),
            morningPercentage: totalActs > 0 ? Math.round((morningCount / totalActs) * 100) : 0,
            afternoonPercentage: totalActs > 0 ? Math.round((afternoonCount / totalActs) * 100) : 0,
            avgActivitiesPerDay: daysActive > 0 ? parseFloat((u.total / daysActive).toFixed(1)) : 0
        };
    }).sort((a: any, b: any) => b.total - a.total);

    const activitiesByType = Object.keys(typeMap).map(key => ({
        name: key,
        value: typeMap[key]
    })).sort((a, b) => b.value - a.value);

    // Sort dates numerically (YYYY-MM-DD format is sortable as string)
    const uniqueDates = Array.from(uniqueDatesSet).sort((a, b) => a.localeCompare(b));

    // Preparar dados do Heatmap (Lista flat para renderização)
    const heatmapData: { date: string; hour: number; value: number }[] = [];
    uniqueDates.forEach(date => {
        for (let h = 0; h < 24; h++) {
            heatmapData.push({
                date: date,
                hour: h,
                value: heatmapMap[`${date}-${h}`] || 0
            });
        }
    });

    const dailyVolume = uniqueDates.map(date => ({
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        count: dailyMap[date]
    }));

    // Datas Limite
    const allDates = activities.map(a => a.date.getTime());
    const minDate = allDates.length ? new Date(Math.min(...allDates)) : null;
    const maxDate = allDates.length ? new Date(Math.max(...allDates)) : null;

    return {
        totalActivities: activities.length,
        dateRange: { start: minDate, end: maxDate },
        userMetrics,
        activitiesByType,
        heatmapData,
        dailyVolume,
        uniqueDates,
        rawActivities: activities
    };
};

const processCSV = (text: string): DashboardData => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
        console.warn('[CSV] CSV file too short');
        return processActivities([]);
    }

    // Parse header to find column indices
    const headerLine = lines[0];
    let typeIdx = -1, dateIdx = -1, userIdx = -1;
    
    // Parse header with quoted fields
    const headerRegex = /"([^"]*)"/g;
    let headerMatch;
    let colIndex = 0;
    while ((headerMatch = headerRegex.exec(headerLine)) !== null) {
        const colName = headerMatch[1].trim();
        if (colName.includes('Tipo')) typeIdx = colIndex;
        else if (colName.includes('Marcado como feito em') || colName.includes('Data')) dateIdx = colIndex;
        else if (colName.includes('Usuário responsável') || colName.includes('Usuario')) userIdx = colIndex;
        colIndex++;
    }

    console.log(`[CSV] Column indices - type: ${typeIdx}, date: ${dateIdx}, user: ${userIdx}`);

    if (typeIdx === -1 || dateIdx === -1 || userIdx === -1) {
        console.error('[CSV] Could not find required columns in header');
        return processActivities([]);
    }

    const activities: Activity[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Extract quoted fields: "value1","value2","value3"
        const fields: string[] = [];
        const fieldRegex = /"([^"]*)"/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(line)) !== null) {
            fields.push(fieldMatch[1]);
        }

        if (fields.length < Math.max(typeIdx, dateIdx, userIdx) + 1) {
            console.warn(`[CSV] Skipping malformed line ${i}: insufficient fields`);
            continue;
        }

        const type = fields[typeIdx]?.trim();
        const dateTimeStr = fields[dateIdx]?.trim();
        const user = fields[userIdx]?.trim();

        if (!type || !dateTimeStr || !user) {
            console.warn(`[CSV] Skipping line ${i}: missing required fields`);
            continue;
        }

        try {
            // Parse datetime: "2026-02-11 15:34:16"
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) {
                console.warn(`[CSV] Invalid date on line ${i}: ${dateTimeStr}`);
                continue;
            }

            const hour = date.getHours();
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

            activities.push({
                id: i.toString(),
                user,
                type,
                date,
                hour,
                dateStr
            });
        } catch (err) {
            console.warn(`[CSV] Error parsing line ${i}:`, err);
        }
    }

    console.log(`[CSV] Successfully parsed ${activities.length} activities from ${lines.length} lines`);
    return processActivities(activities);
};

// --- COMPONENTES VISUAIS ---

const HeatmapGrid = ({ data, uniqueDates, threshold = 0 }: { data: { date: string; hour: number; value: number }[], uniqueDates: string[], threshold?: number }) => {
    const cellMap = useMemo(() => {
        const m = new Map<string, number>();
        data.forEach(d => m.set(`${d.date}-${d.hour}`, d.value));
        return m;
    }, [data]);

    // Ensure dates are always sorted (YYYY-MM-DD format)
    const sortedDates = useMemo(() => {
        return [...uniqueDates].sort((a, b) => a.localeCompare(b));
    }, [uniqueDates]);

    const effectiveMax = Math.max(...Array.from(cellMap.values()).map(v => (v > threshold ? v : 0)), 1);

    const getColor = (value: number) => {
        const effective = value > threshold ? value : 0;
        if (effective === 0) return 'bg-gray-800/40';
        // Gradiente Branddi (Indigo para Laranja/Quente)
        const intensity = effective / effectiveMax;
        if (intensity < 0.2) return 'bg-[#312e81]'; // Indigo muito escuro
        if (intensity < 0.4) return 'bg-[#4338ca]';
        if (intensity < 0.6) return 'bg-[#6366f1]'; // Primary
        if (intensity < 0.8) return 'bg-[#8b5cf6]'; // Roxo
        return 'bg-[#f97316]'; // Laranja (Hot spot)
    };

    return (
        <div className="bg-[#1e293b] border border-gray-700/50 p-6 rounded-2xl shadow-xl overflow-visible">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#f97316]" />
                    Mapa de Calor: Dia vs Hora
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-800/40 rounded-sm"></span> 0</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#6366f1] rounded-sm"></span> Méd</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#f97316] rounded-sm"></span> Alto</div>
                </div>
            </div>

            <div className="overflow-x-auto pb-2 custom-scrollbar">
                <div className="min-w-[1000px]">
                    {/* Header Horas */}
                    <div className="grid grid-cols-[100px_repeat(24,1fr)] gap-1 mb-2">
                        <div className="text-xs text-gray-500 font-medium">Data</div>
                        {HOURS.map(h => (
                            <div key={h} className="text-[10px] text-gray-500 text-center font-medium">
                                {h}h
                            </div>
                        ))}
                    </div>

                    {/* Grid Dias */}
                    <div className="space-y-1">
                        {sortedDates.map((dateStr) => {
                            const formattedDate = new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                            const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

                            return (
                                <div key={dateStr} className="grid grid-cols-[100px_repeat(24,1fr)] gap-1 items-center hover:bg-white/5 rounded-md transition-colors">
                                    <div className={`text-xs font-medium px-2 ${isWeekend ? 'text-[#f97316]' : 'text-gray-400'}`}>
                                        {formattedDate}
                                    </div>
                                    {HOURS.map(hour => {
                                        const val = cellMap.get(`${dateStr}-${hour}`) || 0;
                                                        return (
                                                            <div
                                                                key={`${dateStr}-${hour}`}
                                                                className={`h-8 rounded-sm relative group cursor-pointer transition-all hover:scale-110 hover:z-10 ${getColor(val)}`}
                                                            >
                                                {val > threshold && (
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-3 py-2 rounded-lg border border-gray-700 shadow-2xl whitespace-nowrap z-50">
                                                                        <div className="font-bold">{val} atividades</div>
                                                                        <div className="text-gray-400 text-[10px]">{formattedDate} às {hour}:00</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- NOVO FEATURE: RADAR CHART (ESTRATÉGIA DE CANAIS) ---
const ChannelRadar = ({ data }: { data: UserMetrics }) => {
    if (!data) return null;

    const radarData = [
        { subject: 'E-mail', A: data.email, fullMark: 100 },
        { subject: 'Call', A: data.call, fullMark: 100 },
        { subject: 'WhatsApp', A: data.whatsapp, fullMark: 100 },
        { subject: 'LinkedIn', A: data.linkedin, fullMark: 100 },
    ];

    return (
        <div className="bg-[#1e293b] border border-gray-700/50 p-4 rounded-2xl shadow-xl flex flex-col items-center">
            <h4 className="text-sm font-bold text-gray-400 mb-2">Mix de Canais</h4>
            <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                        <Radar
                            name={data.name}
                            dataKey="A"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fill="#6366f1"
                            fillOpacity={0.4}
                        />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- NOVA COMPONENTE: MATRIZ DE DEDICAÇÃO (SCATTER PLOT) ---
const DedicationMatrix = ({ data }: { data: UserMetrics[] }) => {
    // SAFEGUARDS: Filtrar dados inválidos para evitar crash
    const validData = data.filter(u => u.totalDaysInRange > 0 && u.activeDays > 0);

    const chartData = validData.map(u => ({
        x: parseFloat(((u.activeDays / u.totalDaysInRange) * 100).toFixed(1)),
        y: Math.max(1, Math.round(u.total / (u.activeDays || 1))),
        z: u.avgHoursPerDay || 0, // Fallback para 0
        name: u.name,
        role: u.name.toLowerCase().includes('closer') ? 'Closer' : 'SDR'
    }));

    const avgPres = chartData.reduce((acc, c) => acc + c.x, 0) / (chartData.length || 1) || 50;
    const avgVol = chartData.reduce((acc, c) => acc + c.y, 0) / (chartData.length || 1) || 20;

    return (
        <div className="bg-[#1e293b] border border-gray-700/50 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#f97316]" />
                    Matriz de Dedicação: Volume x Presença
                </h3>
                <div className="text-xs text-gray-400">
                    Bolha = Carga Horária Média
                </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" dataKey="x" name="Presença" unit="%" stroke="#94a3b8" domain={[0, 100]} />
                    <YAxis type="number" dataKey="y" name="Vol/Dia" unit=" ativ" stroke="#94a3b8" />
                    <ZAxis type="number" dataKey="z" range={[60, 400]} name="Horas/Dia" unit="h" />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-[#0f172a] border border-gray-700 p-3 rounded-xl shadow-xl text-white">
                                        <p className="font-bold text-[#6366f1] mb-1">{d.name}</p>
                                        <p className="text-sm">Presença: <span className="font-mono text-white">{d.x}%</span></p>
                                        <p className="text-sm">Média/Dia: <span className="font-mono text-white">{d.y}</span></p>
                                        <p className="text-sm">Amplitude: <span className="font-mono text-white">{d.z}h</span></p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    {/* Quadrantes Background (Opcional - simplificado com ReferenceLines) */}
                    <ReferenceArea x1={0} x2={avgPres} y1={avgVol} y2={9999} fill="#ef4444" fillOpacity={0.05} />
                    <ReferenceArea x1={avgPres} x2={100} y1={avgVol} y2={9999} fill="#22c55e" fillOpacity={0.05} />
                    <ReferenceArea x1={0} x2={avgPres} y1={0} y2={avgVol} fill="#f59e0b" fillOpacity={0.05} />

                    <Scatter name="Time" data={chartData} fill="#6366f1">
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.y > avgVol && entry.x > avgPres ? '#10b981' : entry.y < avgVol && entry.x < avgPres ? '#ef4444' : '#f59e0b'} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};

const DedicationTable = ({ data }: { data: UserMetrics[] }) => {
    return (
        <div className="bg-[#1e293b] border border-gray-700/50 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-700/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#10b981]" />
                    Métricas de Dedicação
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#0f172a] uppercase font-bold text-xs tracking-wider text-gray-500">
                        <tr>
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4">Papel</th>
                            <th className="px-6 py-4 text-center">Total</th>
                            <th className="px-6 py-4 text-center">Presença</th>
                            <th className="px-6 py-4 text-center">Horas/Dia</th>
                            <th className="px-6 py-4 text-center">Ativ/Dia</th>
                            <th className="px-6 py-4 text-center">Pico</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {data.map((u, i) => {
                            const presence = Math.round((u.activeDays / u.totalDaysInRange) * 100);
                            const isLowPresence = presence < 70;
                            const isHighPerformance = u.avgActivitiesPerDay > 50;

                            return (
                                <tr key={i} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isHighPerformance ? 'bg-[#10b981]' : presence > 80 ? 'fbg-[#f59e0b]' : 'bg-[#ef4444]'}`}></div>
                                        {u.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${u.name.toLowerCase().includes('closer')
                                            ? 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20'
                                            : 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20'}`}>
                                            {u.name.toLowerCase().includes('closer') ? 'Closer' : 'SDR'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-white font-bold">{u.total}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`${presence === 100 ? 'text-[#10b981]' : isLowPresence ? 'text-[#ef4444]' : 'text-white'} font-bold`}>
                                            {presence}%
                                        </span>
                                        <span className="text-xs text-gray-500 ml-1">({u.activeDays}/{u.totalDaysInRange})</span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono text-[#f97316]">
                                        {u.avgHoursPerDay}h
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono text-[#f59e0b]">
                                        {u.avgActivitiesPerDay}
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono text-gray-300">
                                        {u.peakHour}:00
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="p-4 bg-[#0f172a] flex gap-4 text-xs text-gray-500 justify-end">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div> Acima da média</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div> Na média</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ef4444]"></div> Abaixo da média</div>
            </div>
        </div>
    );
};

const TimeInsightsCard = ({ metrics }: { metrics: UserMetrics }) => {
    if (!metrics) return null;

    return (
        <div className="bg-[#1e293b] border border-gray-700/50 p-6 rounded-2xl shadow-xl flex flex-col justify-center">
            <h4 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" /> Análise Temporal
            </h4>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <span className="text-gray-300">Horário de Pico</span>
                    <div className="text-2xl font-black text-white bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                        {metrics.peakHour}:00
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                        <span>MANHÃ ({metrics.morningPercentage}%)</span>
                        <span>TARDE ({metrics.afternoonPercentage}%)</span>
                    </div>
                    <div className="h-4 bg-gray-700 rounded-full overflow-hidden flex">
                        <div className="bg-[#f59e0b]" style={{ width: `${metrics.morningPercentage}%` }}></div>
                        <div className="bg-[#6366f1]" style={{ width: `${metrics.afternoonPercentage}%` }}></div>
                    </div>
                    <p className="text-xs text-center text-gray-500 mt-2">
                        {metrics.morningPercentage > metrics.afternoonPercentage
                            ? 'Tendência: Começa forte pela manhã'
                            : 'Tendência: Acelera no período da tarde'}
                    </p>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, icon: Icon, colorClass = "text-white" }: any) => (
    <div className="bg-[#1e293b] border border-gray-700/50 p-6 rounded-2xl shadow-lg hover:border-[#6366f1]/30 transition-all duration-300 group">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                <h3 className={`text-3xl font-bold ${colorClass} tracking-tight`}>{value}</h3>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-xl group-hover:bg-[#6366f1]/10 transition-colors">
                <Icon className={`w-6 h-6 text-gray-400 group-hover:text-[#6366f1] transition-colors`} />
            </div>
        </div>
    </div>
);

// --- TELA DE UPLOAD ---
const UploadScreen = ({ onUpload }: { onUpload: (file: File) => void }) => {
    const [isDragging, setIsDragging] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center min-h-[90vh] p-6 animate-in fade-in zoom-in duration-500 bg-[#0f172a]">
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center p-3 bg-[#6366f1]/10 rounded-2xl mb-6">
                    <BarChart2 className="w-10 h-10 text-[#6366f1]" />
                </div>
                <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
                    Task<span className="text-[#6366f1]">Dash</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
                    Inteligência de dados para times de alta performance.
                    Arraste sua planilha para começar.
                </p>
            </div>

            <div
                className={`relative w-full max-w-2xl group transition-all duration-300 ${isDragging ? 'scale-105' : ''}`}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]);
                }}
            >
                <div className={`absolute -inset-1 bg-gradient-to-r from-[#6366f1] to-[#ec4899] rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500`}></div>
                <label
                    className={`relative flex flex-col items-center justify-center w-full h-80 bg-[#1e293b] rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 
            ${isDragging ? 'border-[#6366f1] bg-[#1e293b]/80' : 'border-gray-700 hover:border-gray-500 hover:bg-[#1e293b]/80'}`}
                >
                    <Upload className={`w-16 h-16 mb-6 text-gray-500 ${isDragging ? 'text-[#6366f1] scale-110' : ''} transition-all`} />
                    <p className="text-2xl font-bold text-white mb-2">Upload CSV de Atividades</p>
                    <p className="text-sm text-gray-400">Suporta exportação padrão do CRM</p>
                    <input
                        type="file"
                        className="hidden"
                        accept=".csv"
                        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                    />
                </label>
            </div>
        </div>
    );
};

// --- APP PRINCIPAL ---
function App() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [view, setView] = useState<'overview' | 'dedication' | 'individual'>('overview');
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [heatmapThreshold, setHeatmapThreshold] = useState<number>(2);

    // removed: handleSync - no longer used after refactor to period-based saving

    // Auto-load data from cloud when component mounts
    useEffect(() => {
        const loadDataFromCloud = async () => {
            setLoading(true);
            try {
                const { data: rows, error } = await supabase.from('activities').select('*');
                if (error) throw error;

                if (rows && rows.length > 0) {
                    const activities: Activity[] = rows.map((r: any, i: number) => ({
                        id: r.id || i.toString(),
                        user: r.user_name,
                        type: r.type,
                        date: new Date(r.activity_date),
                        hour: r.hour,
                        dateStr: new Date(r.activity_date).toISOString().split('T')[0]
                    }));

                    const processed = processActivities(activities);
                    setData(processed);
                    if (processed.userMetrics.length > 0) {
                        setSelectedUser(processed.userMetrics[0].name);
                    }
                }
            } catch (err: any) {
                console.error('Erro ao carregar dados da nuvem:', err.message || err);
            } finally {
                setLoading(false);
            }
        };

        loadDataFromCloud();
    }, []);

    // Auto-save data to cloud (replaces all existing data)
    const handleAutoSaveToCloud = async (activitiesToSave: Activity[]) => {
        setSyncing(true);
        try {
            console.log(`[SAVE] Total activities to save: ${activitiesToSave.length}`);
            
            // Delete ALL existing activities using a valid filter (created_at > epoch)
            const { error: delErr } = await supabase.from('activities').delete().gt('created_at', '1900-01-01');
            if (delErr) throw delErr;
            console.log('[SAVE] Old data deleted');

            // Insert new batch
            const rows = activitiesToSave.map(a => ({
                user_name: a.user,
                type: a.type,
                activity_date: a.date.toISOString(),
                hour: a.hour
            }));

            const batchSize = 5000; // Increased to 5000 for larger datasets
            let inserted = 0;
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                console.log(`[SAVE] Inserting batch ${Math.floor(i / batchSize) + 1}: ${batch.length} rows`);
                const { error } = await supabase.from('activities').insert(batch);
                if (error) {
                    console.error('[SAVE] Insert error:', error);
                    throw error;
                }
                inserted += batch.length;
                console.log(`[SAVE] Inserted so far: ${inserted}`);
                
                // Add small delay between batches to avoid throttling
                if (i + batchSize < rows.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            console.log(`[SAVE] Successfully saved ${inserted} activities`);
        } catch (err: any) {
            console.error('Erro ao salvar automaticamente:', err);
            throw err;
        } finally {
            setSyncing(false);
        }
    };

    const handleFileUpload = (file: File) => {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                setTimeout(() => {
                    const processed = processCSV(e.target?.result as string);
                    setData(processed);
                    if (processed.userMetrics.length > 0) {
                        setSelectedUser(processed.userMetrics[0].name);
                    }
                    setLoading(false);
                }, 1000);
            } catch (err) {
                console.error(err);
                alert('Erro ao processar CSV.');
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    // Memoização dos dados individuais
    const individualData = useMemo(() => {
        if (!data || !selectedUser) return null;
        const userActivities = data.rawActivities.filter(a => a.user === selectedUser);

        // Recalcular Heatmap específico do usuário
        const hmMap: Record<string, number> = {};
        const datesSet = new Set<string>();

        userActivities.forEach(a => {
            const k = `${a.dateStr}-${a.hour}`;
            hmMap[k] = (hmMap[k] || 0) + 1;
            datesSet.add(a.dateStr);
        });

        // Sort dates chronologically
        const sortedDates = Array.from(datesSet).sort((a, b) => a.localeCompare(b));

        const heatmap: { date: string; hour: number; value: number }[] = [];
        sortedDates.forEach(date => {
            for (let h = 0; h < 24; h++) {
                heatmap.push({
                    date: date,
                    hour: h,
                    value: hmMap[`${date}-${h}`] || 0
                });
            }
        });

        // Timeline Individual
        const tlMap: Record<string, number> = {};
        userActivities.forEach(a => {
            tlMap[a.dateStr] = (tlMap[a.dateStr] || 0) + 1;
        });
        const timeline = Object.keys(tlMap).sort().map(d => ({
            date: new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            count: tlMap[d]
        }));

        return {
            metrics: data.userMetrics.find(u => u.name === selectedUser),
            heatmap,
            timeline,
            uniqueDates: sortedDates
        };
    }, [data, selectedUser]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-[#1e293b] border-t-[#6366f1] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-[#6366f1] animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Processando Inteligência</h2>
                    <p className="text-gray-400">Analisando padrões e gerando insights...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return <UploadScreen onUpload={handleFileUpload} />;
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans pb-20 selection:bg-[#6366f1] selection:text-white">
            {/* Top Bar */}
            <div className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur-xl border-b border-gray-800 shadow-2xl">
                <div className="max-w-[1600px] mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] p-2.5 rounded-xl shadow-lg shadow-[#6366f1]/20">
                            <BarChart2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-white">Task<span className="text-[#6366f1]">Dash</span></h1>
                            <p className="text-xs text-gray-400 font-medium">Analytics & Performance</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-[#1e293b] p-1.5 rounded-xl border border-gray-700/50">
                        <button
                            onClick={() => setView('overview')}
                            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${view === 'overview'
                                ? 'bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/25'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                        >
                            <Users className="w-4 h-4" /> Visão Geral
                        </button>
                        <button
                            onClick={() => setView('dedication')}
                            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${view === 'dedication'
                                ? 'bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/25'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                        >
                            <Target className="w-4 h-4" /> Dedicação
                        </button>
                        <button
                            onClick={() => setView('individual')}
                            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${view === 'individual'
                                ? 'bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/25'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                        >
                            <User className="w-4 h-4" /> Visão Individual
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setData(null)}
                            className="text-sm font-medium text-gray-400 hover:text-red-400 transition-colors px-4"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">

                {/* === VISÃO GERAL === */}
                {view === 'overview' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Header Section */}
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">Visão Geral da Equipe</h2>
                                <p className="text-gray-400">
                                    Período: <span className="text-[#f97316] font-mono">{data.dateRange.start?.toLocaleDateString()}</span> até <span className="text-[#f97316] font-mono">{data.dateRange.end?.toLocaleDateString()}</span>
                                </p>
                            </div>

                            <div className="flex items-end gap-3">
                                <button
                                    onClick={() => {
                                        if (!window.confirm(`Salvar ${data.totalActivities} atividades na nuvem (sobrescrever dados existentes)?`)) return;
                                        handleAutoSaveToCloud(data.rawActivities)
                                            .then(() => alert('Dados salvos na nuvem com sucesso!'))
                                            .catch((err: any) => alert('Erro ao salvar: ' + err.message));
                                    }}
                                    disabled={syncing}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#10b981] to-[#059669] text-white hover:shadow-lg hover:shadow-[#10b981]/50 transition-all ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {syncing ? 'Salvando...' : 'Salvar Dados'}
                                </button>
                            </div>
                        </div>

                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KPICard title="Volume Total" value={data.totalActivities} icon={ActivityIcon} colorClass="text-[#6366f1]" />
                            <KPICard title="SDRs Ativos" value={data.userMetrics.length} icon={Users} />
                            <KPICard title="Presença Média" value={`${Math.round(data.userMetrics.reduce((a, b) => a + (b.activeDays / b.totalDaysInRange), 0) / data.userMetrics.length * 100)}%`} icon={Calendar} colorClass="text-[#f97316]" />
                            <KPICard title="Horas/Dia Médio" value={`${(data.userMetrics.reduce((a, b) => a + b.avgHoursPerDay, 0) / data.userMetrics.length).toFixed(1)}h`} icon={Clock} colorClass="text-[#10b981]" />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[450px]">
                            <div className="lg:col-span-2 bg-[#1e293b] border border-gray-700/50 p-6 rounded-2xl shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-[#6366f1]" />
                                    Ranking de Produtividade
                                </h3>
                                <ResponsiveContainer width="100%" height="85%">
                                    <BarChart data={data.userMetrics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" />
                                                <stop offset="100%" stopColor="#8b5cf6" />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                        <XAxis
                                            dataKey="name"
                                            tickFormatter={(v) => v.split(' ')[0]}
                                            stroke="#94a3b8"
                                            axisLine={false}
                                            tickLine={false}
                                            dy={10}
                                        />
                                        <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                                        />
                                        <Bar dataKey="total" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-[#1e293b] border border-gray-700/50 p-6 rounded-2xl shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                    <PieChartIcon className="w-5 h-5 text-[#ec4899]" />
                                    Distribuição
                                </h3>
                                <ResponsiveContainer width="100%" height="90%">
                                    <PieChart>
                                        <Pie
                                            data={data.activitiesByType}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {data.activitiesByType.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={BRAND_COLORS.chart[index % BRAND_COLORS.chart.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                                        <Legend verticalAlign="bottom" align="center" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Heatmap Section */}
                        <div className="space-y-4">
                            <div className="flex justify-end items-center gap-3">
                                <label className="text-sm text-gray-400">Filtro ruído:</label>
                                <select
                                    value={heatmapThreshold}
                                    onChange={(e) => setHeatmapThreshold(Number(e.target.value))}
                                    className="bg-[#0f172a] text-sm border border-gray-700/50 rounded px-2 py-1 text-white"
                                >
                                    <option value={0}>Mostrar tudo</option>
                                    <option value={1}>Ocultar ≤1</option>
                                    <option value={2}>Ocultar ≤2</option>
                                    <option value={3}>Ocultar ≤3</option>
                                    <option value={5}>Ocultar ≤5</option>
                                </select>
                                <div className="text-xs text-gray-500">Ocultar células com ≤ N atividades</div>
                            </div>

                            <HeatmapGrid data={data.heatmapData} uniqueDates={data.uniqueDates} threshold={heatmapThreshold} />
                        </div>

                        {/* Timeline */}
                        <div className="bg-[#1e293b] border border-gray-700/50 p-6 rounded-2xl shadow-xl h-[350px]">
                            <h3 className="text-lg font-bold text-white mb-6">Tendência de Volume Diário</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <AreaChart data={data.dailyVolume}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
                                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorCount)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* === VISÃO DEDICAÇÃO === */}
                {view === 'dedication' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-bold text-white mb-1">Análise de Dedicação & Consistência</h2>
                        <DedicationMatrix data={data.userMetrics} />

                        <div className="grid grid-cols-1 gap-6">
                            <div className="bg-[#1e293b] border border-gray-700/50 p-6 rounded-2xl shadow-xl">
                                <DedicationTable data={data.userMetrics} />
                            </div>
                        </div>
                    </div>
                )}

                {/* === VISÃO INDIVIDUAL === */}
                {view === 'individual' && individualData && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        {/* Header User Selector */}
                        <div className="bg-[#1e293b] border border-gray-700/50 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">Análise de Performance Individual</h2>
                                <p className="text-gray-400">Detalhamento por representante</p>
                            </div>
                            <div className="relative w-72">
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full bg-[#0f172a] text-white border border-gray-600 rounded-xl py-3 pl-4 pr-10 appearance-none focus:ring-2 focus:ring-[#6366f1] outline-none cursor-pointer font-medium"
                                >
                                    {data.userMetrics.map(u => (
                                        <option key={u.name} value={u.name}>{u.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Breakdown Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-[#1e293b] p-5 rounded-2xl border border-gray-700/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><ActivityIcon className="w-12 h-12" /></div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total</p>
                                <p className="text-3xl font-black text-white">{individualData.metrics?.total}</p>
                            </div>
                            <div className="bg-[#1e293b] p-5 rounded-2xl border-l-4 border-[#3b82f6] shadow-lg">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">E-mails</p>
                                <p className="text-2xl font-bold text-white">{individualData.metrics?.email}</p>
                            </div>
                            <div className="bg-[#1e293b] p-5 rounded-2xl border-l-4 border-[#10b981] shadow-lg">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">WhatsApp</p>
                                <p className="text-2xl font-bold text-white">{individualData.metrics?.whatsapp}</p>
                            </div>
                            <div className="bg-[#1e293b] p-5 rounded-2xl border-l-4 border-[#6366f1] shadow-lg">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">LinkedIn</p>
                                <p className="text-2xl font-bold text-white">{individualData.metrics?.linkedin}</p>
                            </div>
                            <div className="bg-[#1e293b] p-5 rounded-2xl border-l-4 border-[#f97316] shadow-lg">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Calls</p>
                                <p className="text-2xl font-bold text-white">{individualData.metrics?.call}</p>
                            </div>
                        </div>

                        {/* Sales Ops: Radar de Canais + Time Insights + Heatmap */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-1 space-y-6">
                                {individualData.metrics && <ChannelRadar data={individualData.metrics} />}
                                {individualData.metrics && <TimeInsightsCard metrics={individualData.metrics} />}
                            </div>
                            <div className="lg:col-span-3">
                                <div className="flex justify-end mb-2">
                                    <label className="text-sm text-gray-400 mr-2">Filtro ruído:</label>
                                    <select
                                        value={heatmapThreshold}
                                        onChange={(e) => setHeatmapThreshold(Number(e.target.value))}
                                        className="bg-[#0f172a] text-sm border border-gray-700/50 rounded px-2 py-1 text-white"
                                    >
                                        <option value={0}>Mostrar tudo</option>
                                        <option value={1}>Ocultar ≤1</option>
                                        <option value={2}>Ocultar ≤2</option>
                                        <option value={3}>Ocultar ≤3</option>
                                        <option value={5}>Ocultar ≤5</option>
                                    </select>
                                </div>
                                <HeatmapGrid data={individualData.heatmap} uniqueDates={individualData.uniqueDates} threshold={heatmapThreshold} />
                            </div>
                        </div>

                        {/* Individual Timeline */}
                        <div className="bg-[#1e293b] border border-gray-700/50 p-6 rounded-2xl shadow-xl h-[400px]">
                            <h3 className="text-lg font-bold text-white mb-6">Consistência Diária</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <BarChart data={individualData.timeline}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
                                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#334155', opacity: 0.2 }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                                    />
                                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
