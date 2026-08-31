import { createContext, useContext, useState, useEffect, useCallback } from "react";

const DEFAULT_DEVICE_ID = 11;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const POLL_INTERVAL_MS = 5000;

const THRESHOLDS = {
  temp: { min: 25, max: 32, warning: 28 },
  tds: { min: 50, max: 500, warning: 300 },
  turb: { min: 0, max: 10, warning: 5 },
  ph: { min: 6.5, max: 8.5, warning: 0.5 },
  ec: { min: 150, max: 800, warning: 500 },
};

const TelemetryContext = createContext(null);

function calculateSafetyStatus(telemetry, backendFlags = {}) {
  if (backendFlags.isAlert === true) {
    const severity = (backendFlags.severity || "").toString().toUpperCase();
    if (severity === "HIGH" || severity === "CRITICAL") return 2;
    if (severity === "MEDIUM" || severity === "WARNING") return 1;
    return 2;
  }

  let violations = 0;
  let critical = 0;

  // Check each parameter
  if (telemetry.temp > THRESHOLDS.temp.max || telemetry.temp < THRESHOLDS.temp.min) {
    critical++;
  } else if (telemetry.temp > THRESHOLDS.temp.warning) {
    violations++;
  }

  if (telemetry.tds > THRESHOLDS.tds.max || telemetry.tds < THRESHOLDS.tds.min) {
    critical++;
  } else if (telemetry.tds > THRESHOLDS.tds.warning) {
    violations++;
  }

  if (telemetry.turb > THRESHOLDS.turb.max) {
    critical++;
  } else if (telemetry.turb > THRESHOLDS.turb.warning) {
    violations++;
  }

  if (telemetry.ph > THRESHOLDS.ph.max || telemetry.ph < THRESHOLDS.ph.min) {
    critical++;
  } else if (Math.abs(telemetry.ph - 7.0) > THRESHOLDS.ph.warning) {
    violations++;
  }

  if (telemetry.ec > THRESHOLDS.ec.max || telemetry.ec < THRESHOLDS.ec.min) {
    critical++;
  } else if (telemetry.ec > THRESHOLDS.ec.warning) {
    violations++;
  }

  if (critical > 0) return 2;
  if (violations > 0) return 1;
  return 0;
}

function parseHardwareData(dataString) {
  // e.g. "TEMP:24.5,TDS:120,TURB:5.2,PH:7.1,EC:180"
  const values = {};
  const pairs = dataString.split(",");
  
  pairs.forEach((pair) => {
    const [key, val] = pair.split(":");
    const numVal = parseFloat(val);
    
    switch (key.trim().toUpperCase()) {
      case "TEMP":
        values.temp = numVal;
        break;
      case "TDS":
        values.tds = numVal;
        break;
      case "TURB":
        values.turb = numVal;
        break;
      case "PH":
        values.ph = numVal;
        break;
      case "EC":
        values.ec = numVal;
        break;
      default:
        break;
    }
  });

  return values;
}

function normalizeBackendData(data) {
  if (!data || typeof data !== "object") {
    return {};
  }

  const normalized = {
    temp: null,
    tds: null,
    turb: null,
    ph: null,
    ec: null,
    isAlert: false,
    severity: null,
    alertReason: null,
    timestamp: data.reading_timestamp || data.timestamp || new Date().toISOString(),
  };

  if (data.temperature_celsius !== undefined) normalized.temp = parseFloat(data.temperature_celsius);
  if (data.temp !== undefined) normalized.temp = parseFloat(data.temp);

  if (data.tds_value !== undefined) normalized.tds = parseFloat(data.tds_value);
  if (data.tds !== undefined) normalized.tds = parseFloat(data.tds);

  if (data.turbidity_value !== undefined) normalized.turb = parseFloat(data.turbidity_value);
  if (data.turb !== undefined) normalized.turb = parseFloat(data.turb);

  if (data.ph_value !== undefined) normalized.ph = parseFloat(data.ph_value);
  if (data.ph !== undefined) normalized.ph = parseFloat(data.ph);

  if (data.ec_value !== undefined) normalized.ec = parseFloat(data.ec_value);
  if (data.ec !== undefined) normalized.ec = parseFloat(data.ec);

  if (data.is_alert !== undefined) normalized.isAlert = Boolean(data.is_alert);
  if (data.severity !== undefined) normalized.severity = data.severity;
  if (data.alert_reason !== undefined) normalized.alertReason = data.alert_reason;

  if (normalized.ec === null && normalized.tds !== null) {
    normalized.ec = Math.round(normalized.tds / 0.64);
  }

  return normalized;
}

async function fetchTelemetryData() {
  const response = await fetch(`${BACKEND_URL}/api/readings/latest/?device_id=${DEFAULT_DEVICE_ID}`);
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }
  return response.json();
}

export function TelemetryProvider({ children }) {
  const [telemetry, setTelemetry] = useState({
    temp: null,
    tds: null,
    turb: null,
    ph: null,
    ec: null,
    safetyStatus: 0,
    isAlert: false,
    severity: null,
    alertReason: null,
    timestamp: new Date().toISOString(),
    isConnected: true,
    hasData: false,
  });

  const [history, setHistory] = useState([]);

  const processTelemetryData = useCallback((rawData) => {
    const hasNoReadings = rawData?.message && rawData.message.toLowerCase().includes("no readings");
    const data = normalizeBackendData(rawData);

    const isAllZero =
      data.temp === 0 &&
      data.tds === 0 &&
      data.turb === 0 &&
      data.ph === 0 &&
      data.ec === 0;

    if (hasNoReadings || isAllZero) {
      setTelemetry((prev) => ({
        ...prev,
        temp: null,
        tds: null,
        turb: null,
        ph: null,
        ec: null,
        safetyStatus: -1,
        isAlert: false,
        severity: null,
        alertReason: null,
        timestamp: data.timestamp,
        isConnected: true,
        hasData: false,
      }));
      return;
    }

    const safetyStatus = calculateSafetyStatus(data, {
      isAlert: data.isAlert,
      severity: data.severity,
    });

    setTelemetry((prev) => ({
      ...prev,
      temp: data.temp,
      tds: data.tds,
      turb: data.turb,
      ph: data.ph,
      ec: data.ec,
      safetyStatus,
      isAlert: data.isAlert,
      severity: data.severity,
      alertReason: data.alertReason,
      timestamp: data.timestamp,
      isConnected: true,
      hasData: true,
    }));

    setHistory((prev) => {
      const newPoint = {
        temp: data.temp,
        tds: data.tds,
        turb: data.turb,
        ph: data.ph,
        ec: data.ec,
        timestamp: data.timestamp,
      };
      const newHistory = [...prev, newPoint];
      return newHistory.slice(-50);
    });
  }, []);

  const updateTelemetry = useCallback(async () => {
    try {
      const rawData = await fetchTelemetryData();
      processTelemetryData(rawData);
    } catch (error) {
      console.error("Failed to fetch telemetry:", error);
      setTelemetry((prev) => ({ ...prev, isConnected: false }));
    }
  }, [processTelemetryData]);

  useEffect(() => {
    updateTelemetry();
    const interval = setInterval(updateTelemetry, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [updateTelemetry, processTelemetryData]);

  const value = {
    temperature: telemetry.temp,
    tds: telemetry.tds,
    turbidity: telemetry.turb,
    phValue: telemetry.ph,
    ec: telemetry.ec,
    safetyStatus: telemetry.safetyStatus,
    isAlert: telemetry.isAlert,
    severity: telemetry.severity,
    alertReason: telemetry.alertReason,
    isConnected: telemetry.isConnected,
    hasData: telemetry.hasData,
    lastUpdated: telemetry.timestamp,

    history,

    // Utility functions
    getSafetyLabel: () => {
      switch (telemetry.safetyStatus) {
        case -1:
          return "No Data";
        case 0:
          return "Safe";
        case 1:
          return "Warning";
        case 2:
          return "Critical";
        default:
          return "Unknown";
      }
    },

    getSafetyColor: () => {
      switch (telemetry.safetyStatus) {
        case -1:
          return "text-slate-600 bg-slate-50 border-slate-200";
        case 0:
          return "text-green-600 bg-green-50 border-green-200";
        case 1:
          return "text-amber-600 bg-amber-50 border-amber-200";
        case 2:
          return "text-red-600 bg-red-50 border-red-200";
        default:
          return "text-gray-600 bg-gray-50 border-gray-200";
      }
    },
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error("useTelemetry must be used within a TelemetryProvider");
  }
  return context;
}

export default TelemetryContext;
