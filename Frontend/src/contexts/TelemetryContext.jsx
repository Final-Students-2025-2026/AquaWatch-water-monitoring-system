import { createContext, useContext, useState, useEffect, useCallback } from "react";

// Hardware baseline values from physical station
const BASELINE = {
  temp: 29.1,
  tds: 55,
  turb: 8.4,
  ph: 7.00,
  ec: 180, // estimated from TDS baseline
};

// Safety thresholds
const THRESHOLDS = {
  temp: { min: 25, max: 32, warning: 28 },
  tds: { min: 50, max: 500, warning: 300 },
  turb: { min: 0, max: 10, warning: 5 },
  ph: { min: 6.5, max: 8.5, warning: 0.5 }, // ± from 7.0
  ec: { min: 150, max: 800, warning: 500 },
};

const TelemetryContext = createContext(null);

function calculateSafetyStatus(telemetry, backendFlags = {}) {
  // Backend-provided tier mapping takes precedence
  // Backend sends: is_alert (boolean), severity (string "HIGH" or "MEDIUM")
  if (backendFlags.isAlert === true) {
    const severity = (backendFlags.severity || "").toString().toUpperCase();
    if (severity === "HIGH" || severity === "CRITICAL") return 2; // Tier 2 - Critical
    if (severity === "MEDIUM" || severity === "WARNING") return 1; // Tier 1 - Warning
    return 2; // Default backend alert = Tier 2
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

  // Determine safety tier
  if (critical > 0) return 2; // Tier 2 - Critical
  if (violations > 0) return 1; // Tier 1 - Warning
  return 0; // Tier 0 - Safe
}

// Parse real hardware string format: TEMP:29.1,TDS:55,TURB:8.4,PH:7.00
function parseHardwareData(dataString) {
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

// Backend API schema mapping - converts backend keys to frontend keys
// Backend schema: temperature_celsius, tds_value, turbidity_value, ph_value
// Frontend schema: temp, tds, turb, ph, ec (derived)
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

  // Map backend keys to frontend keys (handle both snake_case and short names)
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

  // Backend alert flags
  if (data.is_alert !== undefined) normalized.isAlert = Boolean(data.is_alert);
  if (data.severity !== undefined) normalized.severity = data.severity;
  if (data.alert_reason !== undefined) normalized.alertReason = data.alert_reason;

  // If EC not provided, derive it from TDS using standard conversion
  // TDS (ppm) ≈ EC (µS/cm) × 0.64 (for NaCl)
  if (normalized.ec === null && normalized.tds !== null) {
    normalized.ec = Math.round(normalized.tds / 0.64);
  }

  return normalized;
}

// Generate realistic fluctuating mock data around baseline with wave patterns
let waveCounter = 0;
function generateMockTelemetry() {
  waveCounter += 0.3; // Increment for wave calculation

  // Add realistic noise ±5% for most values, ±2% for pH
  const noise = (base, variance) => base + (Math.random() - 0.5) * 2 * variance;

  // Create wave patterns for more visible chart curves
  const wave = Math.sin(waveCounter) * 15; // ±15 µS/cm wave for EC
  const waveTemp = Math.cos(waveCounter * 0.7) * 0.3; // Temperature wave
  const waveTurb = Math.sin(waveCounter * 1.2) * 0.5; // Turbidity wave

  const telemetry = {
    temp: noise(BASELINE.temp, 0.5) + waveTemp, // ±0.5°C + wave
    tds: Math.round(noise(BASELINE.tds, 3)), // ±3 ppm
    turb: noise(BASELINE.turb, 0.3) + waveTurb, // ±0.3 + wave
    ph: noise(BASELINE.ph, 0.05), // ±0.05 pH
    ec: Math.round(noise(BASELINE.ec, 5) + wave), // ±5 + ±15 wave = ±20 µS/cm total
    timestamp: new Date().toISOString(),
  };

  // Ensure values stay in realistic bounds
  telemetry.temp = Math.max(20, Math.min(40, telemetry.temp));
  telemetry.tds = Math.max(0, Math.min(1000, telemetry.tds));
  telemetry.turb = Math.max(0, Math.min(100, telemetry.turb));
  telemetry.ph = Math.max(4, Math.min(10, telemetry.ph));
  telemetry.ec = Math.max(0, Math.min(2000, telemetry.ec));

  return telemetry;
}

const TELEMETRY_MODE = import.meta.env.VITE_TELEMETRY_MODE || "HTTP";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000/ws/telemetry";
const DEFAULT_DEVICE_ID = 1;
const POLL_INTERVAL_MS = 2000;

// Real API/WebSocket connector - isolated for easy swap
async function fetchTelemetryData() {
  if (TELEMETRY_MODE === "HTTP") {
    // Real backend HTTP call
    const response = await fetch(`${BACKEND_URL}/readings/latest?device_id=${DEFAULT_DEVICE_ID}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    
    // Check if the response contains a message (no readings found)
    if (data.message) {
      return null; // Return null to indicate no data
    }
    
    return data;
  }

  // For MOCK mode: return mock data in backend schema format
  const mockData = generateMockTelemetry();
  return {
    reading_id: 0,
    device_id: DEFAULT_DEVICE_ID,
    reading_timestamp: mockData.timestamp,
    ph_value: mockData.ph,
    turbidity_value: mockData.turb,
    tds_value: mockData.tds,
    temperature_celsius: mockData.temp,
    ec_value: mockData.ec,
    is_alert: false,
    alert_reason: null,
  };
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
  });

  const [history, setHistory] = useState([]);
  const [hasData, setHasData] = useState(true);

  const processTelemetryData = useCallback((rawData) => {
    if (!rawData) {
      // No data available, set all values to null and stop polling
      setTelemetry((prev) => ({
        ...prev,
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
        isConnected: false,
      }));
      setHasData(false);
      return;
    }

    setHasData(true);
    const data = normalizeBackendData(rawData);
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
    let interval = null;
    let ws = null;

    if (TELEMETRY_MODE === "WEBSOCKET") {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("WebSocket connected to telemetry stream");
      };

      ws.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          if (rawData.type === "telemetry") {
            processTelemetryData(rawData);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = () => {
        console.error("WebSocket error");
        setTelemetry((prev) => ({ ...prev, isConnected: false }));
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        setTelemetry((prev) => ({ ...prev, isConnected: false }));
      };
    } else {
      // Initial fetch
      updateTelemetry();

      // Only poll if there's data available
      if (hasData) {
        interval = setInterval(updateTelemetry, POLL_INTERVAL_MS);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (ws) ws.close();
    };
  }, [updateTelemetry, processTelemetryData, hasData]);

  const value = {
    // Current telemetry values
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
    lastUpdated: telemetry.timestamp,

    // History for charts
    history,

    // Utility functions
    getSafetyLabel: () => {
      switch (telemetry.safetyStatus) {
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
