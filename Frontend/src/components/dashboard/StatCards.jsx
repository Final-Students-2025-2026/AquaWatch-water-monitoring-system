import { Wifi, Bell, AlertTriangle } from "lucide-react";

export function StatCards({ stats } = {}) {
  const defaultStats = [
    {
      label: "Active Sensors",
      value: "3 / 3",
      subtext: "All online",
      icon: <Wifi size={22} />,
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
    },
    {
      label: "Active Alerts",
      value: "4",
      subtext: "2 critical, 2 warnings",
      icon: <Bell size={22} />,
      color: "text-red-600",
      bgColor: "bg-red-50 border-red-200",
    },
    {
      label: "Overall Status",
      value: "At Risk",
      subtext: "EC & Turbidity exceeded",
      icon: <AlertTriangle size={22} />,
      color: "text-amber-600",
      bgColor: "bg-amber-50 border-amber-200",
    },
  ];

  const displayStats = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {displayStats.map((stat, idx) => (
        <div
          key={idx}
          className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 transform hover:scale-105`}
          style={{
            animationDelay: `${idx * 100}ms`,
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-lg ${stat.bgColor} border flex items-center justify-center`}
            >
              <div className={stat.color}>{stat.icon}</div>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stat.value}
              </p>
              <p className="text-xs text-gray-600 mt-1">{stat.subtext}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
