import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinModal } from "@/components/PinModal";
import { useToast } from "@/contexts/ToastContext";
import {
  Wifi, WifiOff, AlertTriangle, CheckCircle2, Battery, Signal,
  Thermometer, Droplets, Zap, FlaskConical, Activity, Eye,
  MapPin, Clock, Calendar, Plus, Trash2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const statusConfig = {
  normal:   { label: "Normal",   color: "text-green-600",     dot: "bg-green-500",     border: "border-green-200 dark:border-green-900" },
  warning:  { label: "Warning",  color: "text-amber-600",     dot: "bg-amber-500",     border: "border-amber-200 dark:border-amber-900" },
  critical: { label: "Critical", color: "text-destructive",   dot: "bg-destructive",   border: "border-destructive/30" },
  offline:  { label: "Offline",  color: "text-muted-foreground", dot: "bg-gray-400",   border: "border-border" },
};

const paramConfig = [
  { key: "ph",          label: "pH",    icon: FlaskConical, unit: ""       },
  { key: "tds",         label: "TDS",   icon: Droplets,     unit: "mg/L"   },
  { key: "turbidity",   label: "Turb",  icon: Eye,          unit: "NTU"    },
  { key: "temperature", label: "Temp",  icon: Thermometer,  unit: "°C"     },
  { key: "ec",          label: "EC",    icon: Zap,          unit: "µS/cm"  },
  { key: "orp",         label: "ORP",   icon: Activity,     unit: "mV"     },
];

function BatteryBar({ level }) {
  const color = level > 50 ? "bg-green-500" : level > 20 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="flex items-center gap-1.5">
      <Battery className="w-3.5 h-3.5 text-muted-foreground" />
      <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={level} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${level}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{level}%</span>
    </div>
  );
}

export default function Sensors() {
  const [sensors, setSensors] = useState([]);
  const [latestReadings, setLatestReadings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { error } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  // PIN modal state for delete action
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Load sensors on mount
  useEffect(() => {
    loadSensors();
  }, []);

  async function loadSensors() {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/devices`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to load devices");
      const devices = await response.json();
      
      // Transform backend data to match frontend expectations
      const transformedDevices = devices.map(device => ({
        id: device.device_id,
        name: device.water_body_name || device.device_code,
        location: device.location_description || "Unknown",
        online: device.is_active,
        status: device.is_active ? "normal" : "offline",
        battery: 85, // Default values since backend doesn't have these
        signal: 92,
        lastReadingAt: device.created_at,
        installedAt: device.created_at
      }));
      
      setSensors(transformedDevices);
      
      // Load latest readings for each device
      const readingsPromises = transformedDevices.map(async (device) => {
        try {
          const readingResponse = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/readings/latest?device_id=${device.id}`,
            {
              headers: {
                "Authorization": `Bearer ${token}`
              }
            }
          );
          if (readingResponse.status === 404) {
            // No readings for this device, return null
            return null;
          }
          if (readingResponse.ok) {
            const reading = await readingResponse.json();
            return { device_id: device.id, ...reading };
          }
          return null;
        } catch (error) {
          return null;
        }
      });
      
      const readings = await Promise.all(readingsPromises);
      const validReadings = readings.filter(r => r !== null);
      setLatestReadings(validReadings);
    } catch (error) {
      console.error("Failed to load sensors:", error);
      setSensors([]);
    } finally {
      setIsLoading(false);
    }
  }

  const readingsArray = Array.isArray(latestReadings) ? latestReadings : [];
  const readingsBySensor = readingsArray.reduce(
    (acc, r) => { acc[r.device_id] = r; return acc; }, {}
  );

  async function handleCreate() {
    const trimmedName = name.trim();
    const trimmedLocation = location.trim();
    if (!trimmedName || !trimmedLocation) {
      alert("Please enter both sensor name and location");
      return;
    }
    setIsCreating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          device_code: `DEVICE_${Date.now()}`,
          water_body_name: trimmedName,
          location_description: trimmedLocation
        })
      });
      if (!response.ok) throw new Error("Failed to create device");
      await loadSensors();
      setDialogOpen(false);
      setName("");
      setLocation("");
    } catch (error) {
      console.error("Failed to create sensor:", error);
      alert(`Failed to create sensor: ${error?.message || "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  }

  function handleDeleteRequest(id) {
    // Open PIN modal instead of immediate delete
    setPendingDeleteId(id);
    setPinModalOpen(true);
  }

  async function executeDelete() {
    if (!pendingDeleteId) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/devices/${pendingDeleteId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to delete device");
      await loadSensors();
      error("Data deleted successfully");
    } catch (err) {
      console.error("Failed to delete sensor:", err);
      alert(`Failed to delete sensor: ${err?.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  }

  const sensorArray = Array.isArray(sensors) ? sensors : [];
  const summaryItems = [
    { label: "Total Sensors", value: sensorArray.length, icon: Wifi, color: "text-primary", bg: "bg-primary/10" },
    { label: "Online",        value: sensorArray.filter(s => s.online).length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20" },
    { label: "Offline",       value: sensorArray.filter(s => !s.online).length, icon: WifiOff, color: "text-muted-foreground", bg: "bg-muted" },
    { label: "Alerts Active", value: sensorArray.filter(s => s.status === "critical" || s.status === "warning").length, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sensors</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage and monitor all IoT sensor nodes</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)} data-testid="button-add-sensor">
          <Plus className="w-4 h-4" />
          Add Sensor
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryItems.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : sensorArray.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground">
          <p>No sensors registered yet.</p>
          <p className="text-sm mt-2">Add a sensor to start monitoring.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sensorArray.map((sensor) => {
            const sc = statusConfig[sensor.status] ?? statusConfig.offline;
            const reading = readingsBySensor[sensor.id];
            return (
              <Card
                key={sensor.id}
                data-testid={`card-sensor-${sensor.id}`}
                className={`shadow-sm border ${sc.border} transition-all ${!sensor.online ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${!sensor.online ? "bg-muted" : "bg-primary/10"}`}>
                        {sensor.online
                          ? <Wifi className="w-5 h-5 text-primary" />
                          : <WifiOff className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <div className="font-semibold">
                          {sensor.name}
                          <span className="text-muted-foreground font-normal text-sm ml-1.5">({sensor.id})</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{sensor.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge
                        variant={sensor.status === "critical" ? "destructive" : "outline"}
                        className={`text-xs ${sc.color}`}
                      >
                        {sc.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 text-muted-foreground hover:text-destructive"
                        data-testid={`button-delete-sensor-${sensor.id}`}
                        onClick={() => handleDeleteRequest(sensor.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 pb-3">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {paramConfig.map(({ key, label, icon: Icon, unit }) => {
                      const val = reading ? reading[key] : null;
                      return (
                        <div key={key} className="bg-muted/50 rounded-lg p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Icon className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{label}</span>
                          </div>
                          <div className="text-sm font-bold">
                            {val != null ? (
                              <>{Number(val).toFixed(1)}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></>
                            ) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex gap-3">
                      <BatteryBar level={sensor.battery} />
                      <div className="flex items-center gap-1">
                        <Signal className="w-3.5 h-3.5" />
                        <span>{sensor.signal}%</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {sensor.lastReadingAt && !isNaN(new Date(sensor.lastReadingAt).getTime()) && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(sensor.lastReadingAt), { addSuffix: true })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {sensor.installedAt && !isNaN(new Date(sensor.installedAt).getTime())
                          ? format(new Date(sensor.installedAt), "MMM d, yyyy")
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Sensor</DialogTitle>
            <DialogDescription>
              Enter the details for the new IoT sensor station. This will register the sensor in the monitoring system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sensor-name">Sensor Name</Label>
              <Input
                id="sensor-name"
                placeholder="e.g. Station E"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-sensor-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sensor-location">Location</Label>
              <Input
                id="sensor-location"
                placeholder="e.g. Ankobra River — Bogoso"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                data-testid="input-sensor-location"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !location.trim() || isCreating}
              data-testid="button-confirm-add-sensor"
            >
              {isCreating ? "Registering…" : "Register Sensor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Modal for delete confirmation */}
      <PinModal
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          setPendingDeleteId(null);
        }}
        onVerify={executeDelete}
        action="delete this sensor"
        description="Enter your security PIN to confirm sensor deletion. This action cannot be undone."
      />
    </div>
  );
}
