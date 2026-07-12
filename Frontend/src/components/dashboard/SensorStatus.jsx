import { CheckCircle2, AlertTriangle, Wifi } from "lucide-react";

export function SensorStatus({ sensors } = {}) {
  const statusConfig = {
    normal: {
      color: "text-green-600",
      bgColor: "bg-green-100",
      borderColor: "border-green-200",
      icon: <CheckCircle2 size={14} />,
      label: "Online",
    },
    warning: {
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      borderColor: "border-amber-200",
      icon: <AlertTriangle size={14} />,
      label: "Warning",
    },
    critical: {
      color: "text-red-600",
      bgColor: "bg-red-100",
      borderColor: "border-red-200",
      icon: <AlertTriangle size={14} />,
      label: "Critical",
    },
  };

  const defaultSensors: Sensor[] = [
    {
      id: "S-01",
      name: "River Pra — Station A",
      status: "critical",
      lastSeen: "Just now",
    },
    {
      id: "S-02",
      name: "Ofin River — Station B",
      status: "warning",
      lastSeen: "2 min ago",
    },
    {
      id: "S-03",
      name: "Birim River — Station C",
      status: "normal",
      lastSeen: "1 min ago",
    },
  ];

  const displaySensors = sensors || defaultSensors;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Sensor Status
      </h3>

      <div className="space-y-3">
        {displaySensors.map((sensor, idx) => {
          const config = statusConfig[sensor.status];

          return (
            <div
              key={sensor.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${config.borderColor} bg-gray-50 hover:bg-gray-100 transition-colors duration-200`}
              style={{
                animationDelay: `${idx * 100}ms`,
              }}
            >
              {/* Status Indicator */}
              <div
                className={`w-2.5 h-2.5 rounded-full ${config.color} flex-shrink-0`}
              ></div>

              {/* Sensor Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {sensor.name}
                </p>
                <p className="text-xs text-gray-600">
                  {sensor.id} ·{" "}
                  <span className="text-gray-500">{sensor.lastSeen}</span>
                </p>
              </div>

              {/* Status Badge */}
              <div className={`flex-shrink-0 ${config.color}`}>
                {config.icon}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Online Sensors:</span>
          <span className="font-semibold text-green-600">3 / 3</span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi size={14} className="text-green-600" />
          <span className="text-xs text-gray-600">
            All sensors connected and operational
          </span>
        </div>
      </div>
    </div>
  );
}
