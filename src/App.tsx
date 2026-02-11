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
    Cloud,
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

// --- CONFIGURAÇÃO DA MARCA (Branddi) ---
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

    const uniqueDates = Array.from(uniqueDatesSet).sort();

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
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    const userIdx = headers.findIndex(h => h.includes('Usuário responsável'));
    const typeIdx = headers.findIndex(h => h.includes('Tipo'));
    const dateIdx = headers.findIndex(h => h.includes('Marcado como feito em'));

    const activities: Activity[] = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!row) continue;

        const cleanRow = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));

        if (cleanRow[userIdx] && cleanRow[typeIdx] && cleanRow[dateIdx]) {
            const date = new Date(cleanRow[dateIdx]);
            if (isNaN(date.getTime())) continue;

            const user = cleanRow[userIdx];
            const type = cleanRow[typeIdx];
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
        }
    }

    return processActivities(activities);
};

// --- GERADOR DE DADOS DE DEMO (SALES OPS) ---
const generateDemoData = (): DashboardData => {
    const users = ['Ana Silva (SDR)', 'Carlos Souza (SDR)', 'Beatriz Lima (Closer)', 'João Mendes (SDR)', 'Fernanda Costa (Closer)'];
    const types = ['E-mail', 'Call', 'WhatsApp', 'LinkedIn'];
    const baseDate = new Date();
    const activities: Activity[] = [];

    // Gerar 30 dias de dados
    for (let d = 0; d < 30; d++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() - d);
        const dateStr = currentDate.toISOString().split('T')[0];

        users.forEach(user => {
            // Perfil de comportamento aleatório mas consistente
            const isHighPerformer = user.includes('Ana') || user.includes('Fernanda');
            const dailyVolume = isHighPerformer ? Math.floor(Math.random() * 40) + 40 : Math.floor(Math.random() * 30) + 10;

            // Skip de fim de semana (simples)
            if (currentDate.getDay() === 0 || currentDate.getDay() === 6) return;

            // Skip aleatório (falta de consistência)
            if (!isHighPerformer && Math.random() > 0.8) return;

            for (let i = 0; i < dailyVolume; i++) {
                const hour = Math.floor(Math.random() * 10) + 9; // 9h as 19h
                const type = types[Math.floor(Math.random() * types.length)];

                activities.push({
                    id: Math.random().toString(),
                    user,
                    type,
                    date: new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:00:00`),
                    hour,
                    dateStr
                });
            }
        });
    }

    return processActivities(activities);
};

// --- COMPONENTES VISUAIS ---

const HeatmapGrid = ({ data, uniqueDates, threshold = 0 }: { data: { date: string; hour: number; value: number }[], uniqueDates: string[], threshold?: number }) => {
    const cellMap = useMemo(() => {
        const m = new Map<string, number>();
        data.forEach(d => m.set(`${d.date}-${d.hour}`, d.value));
        return m;
    }, [data]);

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
                        {uniqueDates.map((dateStr) => {
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
const UploadScreen = ({ onUpload, onDemo, onLoadCloud, latestPeriod }: { onUpload: (file: File) => void, onDemo: () => void, onLoadCloud: (period?: string) => void, latestPeriod?: string }) => {
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
                <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed mb-6">
                    Inteligência de dados para times de alta performance.
                    Arraste sua planilha para começar.
                </p>

                <div className="flex items-center gap-4 justify-center">
                    <div className="flex items-center gap-2">
                        <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} className="text-sm text-white" />
                    </div>

                    <div className="flex items-center gap-2">
                        <select value={latestPeriod || ''} onChange={() => {}} className="bg-[#0f172a] text-sm border border-gray-700/50 rounded px-2 py-1 text-white">
                            {latestPeriod ? <option value={latestPeriod}>{latestPeriod}</option> : <option value="">Nenhum período salvo</option>}
                        </select>
                        <button onClick={() => onLoadCloud(latestPeriod)} className="px-6 py-2 bg-[#6366f1]/10 hover:bg-[#6366f1]/20 border border-[#6366f1]/20 rounded-full text-sm font-medium text-[#6366f1] transition-colors flex items-center gap-2">
                            <Cloud className="w-4 h-4" />
                            Carregar último período
                        </button>
                    </div>
                </div>
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
    const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
    const [cloudPeriod, setCloudPeriod] = useState<string>('');
    const [savePeriod, setSavePeriod] = useState<string>('');
    const [latestPeriod, setLatestPeriod] = useState<string>('');

    const handleSync = async () => {
        if (!data) return;
        setSyncing(true);
        try {
            const rows = data.rawActivities.map(a => ({
                user_name: a.user,
                type: a.type,
                activity_date: a.date.toISOString(),
                hour: a.hour
            }));

            const batchSize = 100;
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                const { error } = await supabase.from('activities').upsert(batch);
                if (error) throw error;
            }

            alert('Dados sincronizados com Supabase!');
        } catch (err: any) {
            console.error(err);
            alert('Erro ao sincronizar: ' + (err.message || 'Verifique as credenciais'));
        } finally {
            setSyncing(false);
        }
    };

    const fetchCloudPeriods = async () => {
        try {
            const { data: rows, error } = await supabase.from('activities').select('period');
            if (error) throw error;
            const periods = Array.from(new Set((rows || []).map((r: any) => r.period).filter(Boolean))).filter((p:any) => p !== 'demo');
            // sort descending (assumes YYYY-MM) and pick latest
            const sorted = periods.slice().sort((a:any,b:any) => b.localeCompare(a));
            setAvailablePeriods(sorted);
            if (sorted.length > 0) {
                if (!cloudPeriod) setCloudPeriod(sorted[0]);
                setLatestPeriod(sorted[0]);
            } else {
                setLatestPeriod('');
            }
        } catch (err: any) {
            console.error('Erro ao buscar períodos:', err.message || err);
        }
    };

    const handleSaveToCloud = async (periodLabel?: string) => {
        if (!data) return alert('Sem dados para salvar.');
        const label = periodLabel || savePeriod || (data.dateRange.start ? `${data.dateRange.start.getFullYear()}-${String(data.dateRange.start.getMonth() + 1).padStart(2, '0')}` : 'unknown');
        if (!window.confirm(`Salvar ${data.totalActivities} atividades como período '${label}' na nuvem (sobrescrever dados existentes deste período)?`)) return;
        setSyncing(true);
        try {
            // Delete existing rows for this period (overwrite semantics)
            const { error: delErr } = await supabase.from('activities').delete().eq('period', label);
            if (delErr) throw delErr;

            const rows = data.rawActivities.map(a => ({
                user_name: a.user,
                type: a.type,
                activity_date: a.date.toISOString(),
                hour: a.hour,
                period: label,
                is_demo: false
            }));

            // Insert in batches
            const batchSize = 100;
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                const { error } = await supabase.from('activities').insert(batch);
                if (error) throw error;
            }

            alert('Dados salvos na nuvem com sucesso!');
            await fetchCloudPeriods();
        } catch (err: any) {
            console.error(err);
            const msg = err?.message || String(err);
            if (msg.includes('column') && msg.includes('does not exist')) {
                alert('Erro ao salvar: parece que a coluna `period` não existe na tabela `activities`. Rode a migration supabase_add_columns.sql (veja o arquivo na raiz do projeto) para criar as colunas necessárias e tente novamente.');
            } else {
                alert('Erro ao salvar: ' + msg);
            }
        } finally {
            setSyncing(false);
        }
    };

    const handleClearCloudSamples = async () => {
        if (!window.confirm('Isto irá apagar registros sem `period` ou com `period = "demo"` na tabela `activities`. Continuar?')) return;
        setSyncing(true);
        try {
            // Apaga apenas linhas onde period IS NULL OU period = 'demo'
            const { error } = await supabase.from('activities').delete().or('period.is.null,period.eq.demo');
            if (error) throw error;
            alert('Registros sem período ou marcados como demo removidos da nuvem.');
            await fetchCloudPeriods();
        } catch (err: any) {
            console.error(err);
            alert('Erro ao limpar: ' + (err.message || err));
        } finally {
            setSyncing(false);
        }
    };

    const handleLoadFromCloud = async (period?: string) => {
        // default: load selected cloudPeriod if set, otherwise fetch all
        setLoading(true);
        try {
            const targetPeriod = period ?? cloudPeriod;
            let query = supabase.from('activities').select('*');
            if (targetPeriod) query = query.eq('period', targetPeriod);
            const { data: rows, error } = await query;
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
            } else {
                alert('Nenhum dado encontrado para o período selecionado na nuvem.');
            }
        } catch (err: any) {
            console.error(err);
            alert('Erro ao carregar da nuvem: ' + err.message);
        } finally {
            setLoading(false);
        }
    };


    const handleDemo = () => {
        setLoading(true);
        setTimeout(() => {
            const demoData = generateDemoData();
            setData(demoData);
            if (demoData.userMetrics.length > 0) setSelectedUser(demoData.userMetrics[0].name);
            setLoading(false);
        }, 800);
    };

    const handleFileUpload = (file: File, partial = false) => {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Simulando delay para sensação de processamento "inteligente"
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

    // removed: save-upload helper (saving now handled from dashboard save control)

    useEffect(() => {
        // Preload available periods for the upload screen
        fetchCloudPeriods();
    }, []);

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

        const heatmap: { date: string; hour: number; value: number }[] = [];
        data.uniqueDates.forEach(date => {
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
            uniqueDates: data.uniqueDates
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
        return <UploadScreen onUpload={handleFileUpload} onDemo={handleDemo} onLoadCloud={handleLoadFromCloud} latestPeriod={latestPeriod} />;
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
                            <h1 className="text-xl font-extrabold tracking-tight text-white">Branddi<span className="text-[#6366f1]">Dash</span></h1>
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
                        <div className="flex items-center gap-2">
                            <select
                                value={cloudPeriod}
                                onChange={(e) => setCloudPeriod(e.target.value)}
                                onFocus={() => fetchCloudPeriods()}
                                className="bg-[#0f172a] text-sm border border-gray-700/50 rounded px-2 py-1 text-white"
                            >
                                <option value="">Todos períodos</option>
                                {availablePeriods.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>

                            <button
                                onClick={handleLoadFromCloud}
                                disabled={loading}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold border border-[#6366f1] text-[#6366f1] hover:bg-[#6366f1]/10 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Carregando...' : 'Carregar'}
                            </button>

                            {/* save controls moved to dashboard view per UX simplification */}

                            <button
                                onClick={handleClearCloudSamples}
                                className="text-sm font-medium text-gray-400 hover:text-red-400 transition-colors px-3"
                            >
                                Limpar Nuvem
                            </button>

                            <button
                                onClick={() => setData(null)}
                                className="text-sm font-medium text-gray-400 hover:text-red-400 transition-colors px-4"
                            >
                                Sair
                            </button>
                        </div>
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
                                <select
                                    value={savePeriod}
                                    onChange={(e) => setSavePeriod(e.target.value)}
                                    className="bg-[#0f172a] text-sm border border-gray-700/50 rounded px-2 py-1 text-white"
                                >
                                    <option value="">Novo mês...</option>
                                    {availablePeriods.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>

                                <input
                                    placeholder="Período (YYYY-MM)"
                                    value={savePeriod}
                                    onChange={(e) => setSavePeriod(e.target.value)}
                                    className="bg-[#0f172a] text-sm border border-gray-700/50 rounded px-2 py-1 text-white"
                                />

                                <button
                                    onClick={() => handleSaveToCloud(savePeriod)}
                                    disabled={syncing}
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold border border-[#10b981] text-[#10b981] hover:bg-[#10b981]/10 transition-colors ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
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
