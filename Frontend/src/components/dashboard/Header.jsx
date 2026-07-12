import { AlertTriangle, Download } from "lucide-react";

export function Header({
  title = "System Overview",
  subtitle = "Live readings · Updated every 30 seconds",
  criticalAlerts = 2,
  warningAlerts = 0,
  onExport,
} = {}) {
  const totalAlerts = criticalAlerts + warningAlerts;

  return (
    <div className="flex justify-between items-start bg-gradient-to-r from-sky-50 to-cyan-50 p-8 rounded-xl border border-sky-100">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-sky-900">{title}</h1>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>

      <div className="flex gap-3 items-center">
        {/* Alert Badge */}
        {totalAlerts > 0 && (
          <div>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow">
              <div className="relative">
                <AlertTriangle size={16} className="text-red-600" />
                {criticalAlerts > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                )}
              </div>
              <span className="text-sm font-semibold text-red-700">
                {criticalAlerts} Critical{" "}
                {criticalAlerts === 1 ? "Alert" : "Alerts"}
              </span>
            </div>
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={onExport}
          className="bg-gradient-to-r from-sky-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transform hover:scale-105 transition-all duration-200 active:scale-95"
        >
          <Download size={16} />
          Export Report
        </button>
      </div>
    </div>
  );
}
