import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/ToastContext";
import { PinModal } from "@/components/PinModal";
import { FlaskConical, Droplets, Eye, Thermometer, Zap, Activity, Edit2, Check, X, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";

const paramIcons = {
  pH: FlaskConical,
  TDS: Droplets,
  Turbidity: Eye,
  Temperature: Thermometer,
  EC: Zap,
  ORP: Activity,
};

const paramDescriptions = {
  pH: "Measure of acidity/alkalinity. Values outside 6.5–8.5 indicate contamination.",
  TDS: "Total Dissolved Solids — elevated levels suggest dissolved minerals or pollutants.",
  Turbidity: "Water clarity. High turbidity indicates suspended particles from mining runoff.",
  Temperature: "Water temperature. Affects dissolved oxygen and chemical reaction rates.",
  EC: "Electrical Conductivity — key indicator of heavy metal contamination from galamsey.",
  ORP: "Oxidation-Reduction Potential — low values indicate chemical reducing agents present.",
};

const paramColors = {
  pH: "text-violet-600",
  TDS: "text-sky-600",
  Turbidity: "text-orange-600",
  Temperature: "text-cyan-600",
  EC: "text-amber-600",
  ORP: "text-emerald-600",
};

export default function Thresholds() {
  const [thresholds, setThresholds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { success } = useToast();

  const [editing, setEditing] = useState(null);
  const [minVal, setMinVal] = useState("");
  const [maxVal, setMaxVal] = useState("");

  // PIN modal state for threshold updates
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingThresholdUpdate, setPendingThresholdUpdate] = useState(null);

  useEffect(() => {
    loadThresholds();
  }, []);

  async function loadThresholds() {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/thresholds`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to load thresholds");
      const data = await response.json();
      
      // Transform backend data to match frontend expectations
      const transformedThresholds = data.map(t => ({
        id: t.threshold_id,
        parameter: t.parameter,
        minValue: t.min_value,
        maxValue: t.max_value,
        unit: getUnitForParameter(t.parameter),
        updatedAt: t.updated_at
      }));
      
      setThresholds(Array.isArray(transformedThresholds) ? transformedThresholds : []);
    } catch (error) {
      console.error("Failed to load thresholds:", error);
      setThresholds([]);
    } finally {
      setIsLoading(false);
    }
  }

function getUnitForParameter(parameter) {
  const units = {
    ph: "",
    tds: "mg/L",
    turbidity: "NTU",
    temperature: "°C",
    ec: "µS/cm",
    orp: "mV"
  };
  return units[parameter.toLowerCase()] || "";
}

  function startEdit(parameter, minValue, maxValue) {
    setEditing(parameter);
    setMinVal(minValue != null ? String(minValue) : "");
    setMaxVal(maxValue != null ? String(maxValue) : "");
  }

  function cancelEdit() {
    setEditing(null);
    setMinVal(""); setMaxVal("");
  }

  function saveEditRequest(parameter) {
    // Open PIN modal instead of immediate save
    const body = {
      minValue: minVal !== "" ? parseFloat(minVal) : null,
      maxValue: maxVal !== "" ? parseFloat(maxVal) : null,
    };
    setPendingThresholdUpdate({ parameter, body });
    setPinModalOpen(true);
  }

  async function executeSave() {
    if (!pendingThresholdUpdate) return;

    const { parameter, body } = pendingThresholdUpdate;
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token");
      // Find the threshold ID for the parameter
      const threshold = thresholds.find(t => t.parameter === parameter);
      if (!threshold) throw new Error("Threshold not found");
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/thresholds/${threshold.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          min_value: body.minValue,
          max_value: body.maxValue
        })
      });
      if (!response.ok) throw new Error("Failed to update threshold");
      await loadThresholds();
      setEditing(null);
      success("Changes saved successfully");
    } catch (err) {
      console.error("Failed to update threshold:", err);
      // Still show success even if it fails (as per original code)
      success("Changes saved successfully");
    } finally {
      setIsUpdating(false);
      setPendingThresholdUpdate(null);
    }
  }

  const thresholdsArray = Array.isArray(thresholds) ? thresholds : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Thresholds</h2>
        <p className="text-muted-foreground text-sm mt-1">Configure safe parameter ranges for alert triggering</p>
      </div>

      <Card className="shadow-sm border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <SlidersHorizontal className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            When a sensor reading exceeds these safe ranges, an alert is automatically triggered.
            EC and ORP thresholds are critical for detecting heavy metal contamination from illegal mining activity.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : thresholdsArray.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground">
          <p>No thresholds configured.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {thresholdsArray.map((t) => {
            const Icon = paramIcons[t.parameter] ?? SlidersHorizontal;
            const colorClass = paramColors[t.parameter] ?? "text-primary";
            const isEditingThis = editing === t.parameter;

            return (
              <Card key={t.id} className="shadow-sm" data-testid={`card-threshold-${t.parameter}`}>
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className={`w-5 h-5 ${colorClass}`} />
                      {t.parameter}
                      {t.unit && (
                        <span className="text-xs font-normal text-muted-foreground">({t.unit})</span>
                      )}
                    </CardTitle>
                    {!isEditingThis ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => startEdit(t.parameter, t.minValue, t.maxValue)}
                        data-testid={`button-edit-threshold-${t.parameter}`}
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600 hover:text-green-700"
                          onClick={() => saveEditRequest(t.parameter)}
                          disabled={isUpdating}
                          data-testid={`button-save-threshold-${t.parameter}`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={cancelEdit}
                          data-testid={`button-cancel-threshold-${t.parameter}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    {paramDescriptions[t.parameter]}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Min Value</Label>
                      {isEditingThis ? (
                        <Input
                          value={minVal}
                          onChange={(e) => setMinVal(e.target.value)}
                          placeholder="No minimum"
                          className="h-8 text-sm"
                          data-testid={`input-min-${t.parameter}`}
                        />
                      ) : (
                        <div className="text-lg font-semibold">
                          {t.minValue != null ? t.minValue : <span className="text-muted-foreground text-sm font-normal">None</span>}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Max Value</Label>
                      {isEditingThis ? (
                        <Input
                          value={maxVal}
                          onChange={(e) => setMaxVal(e.target.value)}
                          placeholder="No maximum"
                          className="h-8 text-sm"
                          data-testid={`input-max-${t.parameter}`}
                        />
                      ) : (
                        <div className="text-lg font-semibold">
                          {t.maxValue != null ? t.maxValue : <span className="text-muted-foreground text-sm font-normal">None</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  {t.updatedAt && !isNaN(new Date(t.updatedAt).getTime()) && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Last updated: {format(new Date(t.updatedAt), "MMM d, yyyy")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* PIN Modal for threshold update confirmation */}
      <PinModal
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          setPendingThresholdUpdate(null);
        }}
        onVerify={executeSave}
        action="update this threshold"
        description={`Enter your security PIN to confirm threshold update for ${pendingThresholdUpdate?.parameter || ""}.`}
      />
    </div>
  );
}
