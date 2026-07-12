import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/ToastContext";
import { AlertTriangle, Bell, BellOff, BellRing, CheckCircle2, Clock, MapPin, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function severityClass(severity) {
  return severity === "critical"
    ? "border-l-destructive bg-destructive/5"
    : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20";
}
function severityBadge(severity) {
  return severity === "critical" ? "destructive" : "outline";
}

export default function Alerts() {
  const [alertsArray, setAlertsArray] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSilenced, setIsSilenced] = useState(false);
  const { success, info } = useToast();

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/alerts`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch alerts");
      const data = await response.json();
      setAlertsArray(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load alerts:", error);
      setAlertsArray([]);
    } finally {
      setIsLoading(false);
    }
  }

  const activeAlerts = alertsArray.filter((a) => a.status === "active");
  const acknowledgedAlerts = alertsArray.filter((a) => a.status === "acknowledged");
  const resolvedAlerts = alertsArray.filter((a) => a.status === "resolved");

  async function handleUpdate(id, status) {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/alerts/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error("Failed to update alert");
      await loadAlerts();
      if (status === "acknowledged") {
        info("Alert acknowledged");
      } else if (status === "resolved") {
        success("Alert resolved");
      }
    } catch (error) {
      console.error("Failed to update alert:", error);
      alert("Failed to update alert status");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSilenceAll() {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token");
      if (!isSilenced) {
        // Silence: Acknowledge all active alerts
        if (activeAlerts.length === 0) {
          setIsUpdating(false);
          return;
        }
        await Promise.all(
          activeAlerts.map((alert) => 
            fetch(`${import.meta.env.VITE_BACKEND_URL}/alerts/${alert.alert_id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ status: "acknowledged" })
            })
          )
        );
        await loadAlerts();
        setIsSilenced(true);
        success(`${activeAlerts.length} alert${activeAlerts.length > 1 ? "s" : ""} silenced`);
      } else {
        // Unsilence: Restore all acknowledged alerts to active
        if (acknowledgedAlerts.length === 0) {
          setIsSilenced(false);
          setIsUpdating(false);
          return;
        }
        await Promise.all(
          acknowledgedAlerts.map((alert) => 
            fetch(`${import.meta.env.VITE_BACKEND_URL}/alerts/${alert.alert_id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ status: "active" })
            })
          )
        );
        await loadAlerts();
        setIsSilenced(false);
        success(`${acknowledgedAlerts.length} alert${acknowledgedAlerts.length > 1 ? "s" : ""} restored`);
      }
    } catch (error) {
      console.error("Failed to update alerts:", error);
      alert("Failed to update alerts");
    } finally {
      setIsUpdating(false);
    }
  }

  const summaryCards = [
    { label: "Active", count: activeAlerts.length, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Acknowledged", count: acknowledgedAlerts.length, icon: Bell, color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/20" },
    { label: "Resolved Today", count: resolvedAlerts.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alerts</h2>
          <p className="text-muted-foreground text-sm mt-1">Threshold violations across all monitoring stations</p>
        </div>
        <Button
          variant={isSilenced ? "default" : "outline"}
          size="sm"
          className="gap-2"
          data-testid="button-silence-all"
          onClick={handleSilenceAll}
          disabled={isUpdating || (!isSilenced && activeAlerts.length === 0) || (isSilenced && acknowledgedAlerts.length === 0)}
        >
          {isSilenced ? (
            <>
              <BellRing className="w-4 h-4" />
              Restore All
            </>
          ) : (
            <>
              <BellOff className="w-4 h-4" />
              Silence All
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {summaryCards.map(({ label, count, icon: Icon, color, bg }) => (
          <Card key={label} className="shadow-sm" data-testid={`card-alert-${label.toLowerCase()}`}>
            <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
              <div className={`p-2 sm:p-2.5 rounded-lg ${bg} shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{label}</p>
                <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {alertsArray.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <p className="font-medium">No alerts — all parameters within safe range</p>
              </CardContent>
            </Card>
          ) : (
            alertsArray.map((alert) => (
            <div
              key={alert.alert_id}
              data-testid={`alert-item-${alert.alert_id}`}
              className={`border-l-4 rounded-xl border border-border p-4 transition-all ${severityClass(alert.severity)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {alert.alert_type} — {alert.ph_value || alert.tds_value || alert.turbidity_value || alert.temperature_celsius}
                    </span>
                    <Badge variant={severityBadge(alert.severity)} className="text-xs uppercase">
                      {alert.severity}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        alert.status === "active" ? "border-destructive text-destructive" :
                        alert.status === "acknowledged" ? "border-violet-500 text-violet-600" :
                        "border-green-500 text-green-600"
                      }`}
                    >
                      {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{alert.alert_message}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {alert.device_code}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {alert.created_at && !isNaN(new Date(alert.created_at).getTime())
                        ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })
                        : "Unknown time"}
                    </span>
                  </div>
                </div>
                {alert.status === "active" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-acknowledge-${alert.alert_id}`}
                      onClick={() => handleUpdate(alert.alert_id, "acknowledged")}
                      disabled={isUpdating}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      data-testid={`button-resolve-${alert.alert_id}`}
                      onClick={() => handleUpdate(alert.alert_id, "resolved")}
                      disabled={isUpdating}
                    >
                      Resolve
                    </Button>
                  </div>
                )}
                {alert.status === "acknowledged" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-green-600 border-green-500 hover:bg-green-50"
                    data-testid={`button-resolve-ack-${alert.alert_id}`}
                    onClick={() => handleUpdate(alert.alert_id, "resolved")}
                    disabled={isUpdating}
                  >
                    Resolve
                  </Button>
                )}
                {alert.status === "resolved" && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-1" />
                )}
              </div>
            </div>
          ))
          )}
        </div>
      )}
    </div>
  );
}
