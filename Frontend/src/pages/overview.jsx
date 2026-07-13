import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Activity, AlertTriangle, CheckCircle2, Thermometer, FlaskConical, Eye, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useTelemetry } from "@/contexts/TelemetryContext";

const STATUS_DOT = {
  normal:   "bg-green-500",
  warning:  "bg-amber-500",
  critical: "bg-destructive",
  offline:  "bg-muted-foreground/50",
};

export default function Overview() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [sensors, setSensors] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Live telemetry from hardware
  const {
    temperature,
    tds,
    turbidity,
    phValue,
    ec,
    safetyStatus,
    isAlert,
    severity,
    alertReason,
    isConnected,
    hasData,
    history,
    getSafetyLabel,
    getSafetyColor,
  } = useTelemetry();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        
        // Load devices (sensors)
        const devicesResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/devices`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const devicesData = devicesResponse.ok ? await devicesResponse.json() : [];
        const safeDevicesData = Array.isArray(devicesData) ? devicesData : [];
        
        // Load alerts for summary
        const alertsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/alerts`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const alertsData = alertsResponse.ok ? await alertsResponse.json() : [];
        const safeAlertsData = Array.isArray(alertsData) ? alertsData : [];
        
        // Calculate summary
        const summaryData = {
          totalSensors: safeDevicesData.length,
          onlineSensors: safeDevicesData.filter(d => d.is_active).length,
          offlineSensors: safeDevicesData.filter(d => !d.is_active).length,
          criticalAlerts: safeAlertsData.filter(a => a.status === "active" && a.severity === "critical").length,
          warningAlerts: safeAlertsData.filter(a => a.status === "active" && (a.severity === "medium" || a.severity === "warning")).length,
          overallStatus: safeAlertsData.some(a => a.status === "active" && a.severity === "critical") ? "critical" : 
                        safeAlertsData.some(a => a.status === "active") ? "warning" : "normal",
        };
        
        setSummary(summaryData);
        setSensors(safeDevicesData);
        
        // Generate trend data from telemetry history
        const trendsData = history.map(h => ({
          label: new Date(h.timestamp).getHours(),
          ec: h.ec,
          ph: h.ph,
          tds: h.tds,
          turbidity: h.turb,
          temperature: h.temp,
        }));
        setTrends(trendsData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const statusLabel = summary?.overallStatus?.replace("_", " ") ?? "Unknown";
  const statusColor =
    summary?.overallStatus === "critical" ? "text-destructive" :
    summary?.overallStatus === "warning"  ? "text-amber-500"   :
    summary?.overallStatus === "normal"   ? "text-green-600"   : "text-muted-foreground";

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">System Overview</h2>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-muted-foreground font-medium hidden sm:inline">Live Monitoring Active</span>
        </div>
      </div>

      {/* Summary cards — 2-col on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Sensors</CardTitle>
            <Activity className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">
              {summary?.onlineSensors ?? 0}<span className="text-muted-foreground text-lg font-normal"> / {summary?.totalSensors ?? 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{summary?.offlineSensors ?? 0} offline</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-destructive">{summary?.criticalAlerts ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Immediate attention</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-amber-500">{summary?.warningAlerts ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Approaching thresholds</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Overall Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-2xl font-bold capitalize ${statusColor}`}>{statusLabel}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Based on recent readings</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="shadow-sm border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Temperature</CardTitle>
            <Thermometer className="h-4 w-4 text-cyan-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-cyan-600">{hasData ? `${temperature?.toFixed(1) ?? "--"}°C` : "--"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{hasData ? "Live from station" : "No readings yet"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">TDS</CardTitle>
            <Droplet className="h-4 w-4 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{hasData ? (tds ?? "--") : "--"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{hasData ? "ppm" : "No readings yet"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Turbidity</CardTitle>
            <Eye className="h-4 w-4 text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{hasData ? `${turbidity?.toFixed(1) ?? "--"}` : "--"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{hasData ? "NTU" : "No readings yet"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">pH Level</CardTitle>
            <FlaskConical className="h-4 w-4 text-violet-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-violet-600">{hasData ? (phValue?.toFixed(2) ?? "--") : "--"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{hasData ? "Acidity" : "No readings yet"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">EC</CardTitle>
            <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{hasData ? (ec ?? "--") : "--"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{hasData ? "µS/cm" : "No readings yet"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Safety Status Banner */}
      <div className={`rounded-lg border p-4 ${getSafetyColor()}`}>
        <div className="flex items-center gap-3">
          {safetyStatus === 0 && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          {safetyStatus === 1 && <AlertTriangle className="h-5 w-5 text-amber-600" />}
          {safetyStatus === 2 && <AlertTriangle className="h-5 w-5 text-red-600" />}
          {safetyStatus === -1 && <Activity className="h-5 w-5 text-slate-600" />}
          <div>
            <p className="font-semibold">
              Water Quality Status: {getSafetyLabel()}
              {hasData && ` (Tier ${safetyStatus})`}
            </p>
            <p className="text-sm opacity-75">
              {!hasData
                ? "No sensor readings available yet"
                : isConnected
                  ? "Live data from hardware station"
                  : "Connection lost - using cached data"}
              {isAlert && severity && ` • Backend severity: ${severity}`}
            </p>
            {alertReason && (
              <p className="text-sm font-medium mt-1">{alertReason}</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts + sensor list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Live Telemetry Trend chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Activity className="w-4 h-4 text-primary shrink-0" />
              Live Telemetry Trend (EC)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-56 md:h-72 w-full">
              {history && history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEcLive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                      labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                    />
                    <Area type="monotone" dataKey="ec" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorEcLive)" name="EC (µS/cm)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Collecting live telemetry data...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sensor status list */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base flex items-center justify-between">
              Sensor Status
              <Link href="/sensors" className="text-xs font-normal text-primary hover:underline">
                View all →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {Array.isArray(sensors) && sensors.length > 0 ? (
                sensors.map((sensor) => (
                  <div key={sensor.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{sensor.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{sensor.location}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[sensor.status] ?? STATUS_DOT.offline}`} />
                      <span className="text-xs font-medium capitalize hidden sm:inline">{sensor.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">No sensors found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
