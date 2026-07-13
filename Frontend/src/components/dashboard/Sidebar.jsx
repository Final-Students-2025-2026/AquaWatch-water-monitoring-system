import {
  Activity,
  Clock,
  Bell,
  Wifi,
  FlaskConical,
  LogOut,
} from "lucide-react";

export function Sidebar({
  activeTab = "overview",
  onTabChange,
  sensorStatus = { online: 3, total: 3 },
} = {}) {
  const navItems = [
    {
      label: "Overview",
      icon: <Activity size={16} />,
      active: activeTab === "overview",
    },
    {
      label: "Historical Data",
      icon: <Clock size={16} />,
      active: activeTab === "historical",
    },
    {
      label: "Alerts",
      icon: <Bell size={16} />,
      active: activeTab === "alerts",
    },
    {
      label: "Sensors",
      icon: <Wifi size={16} />,
      active: activeTab === "sensors",
    },
    {
      label: "Thresholds",
      icon: <FlaskConical size={16} />,
      active: activeTab === "thresholds",
    },
  ];

  return (
    <aside className="w-56 bg-gradient-to-b from-sky-900 to-sky-950 text-sky-100 flex flex-col py-6 shadow-xl border-r border-sky-800">
      {/* Logo */}
      <div className="px-5 pb-6 border-b border-sky-700">
        <div className="flex items-center gap-3 mb-4 group hover:opacity-80 transition-opacity">
          <img src="/logo.jpeg" alt="AquaWatch" className="w-8 h-8 rounded-lg object-cover shadow-lg group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-sm font-bold text-white">AquaWatch</div>
            <div className="text-xs text-sky-300">IoT Monitor</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, icon, active }) => (
          <button
            key={label}
            onClick={() => onTabChange?.(label.toLowerCase().replace(" ", "-"))}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-sky-700 text-white shadow-md"
                : "text-sky-200 hover:bg-sky-800/50 hover:text-sky-50"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* Sensor Status */}
      <div className="px-5 py-4 border-t border-sky-700 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-xs text-sky-200">
            {sensorStatus.online} of {sensorStatus.total} sensors online
          </span>
        </div>
      </div>

      {/* Logout */}
      <div className="px-3 pb-2">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-200 hover:bg-red-900/20 transition-colors group">
          <LogOut
            size={16}
            className="group-hover:translate-x-1 transition-transform"
          />
          Logout
        </button>
      </div>
    </aside>
  );
}
