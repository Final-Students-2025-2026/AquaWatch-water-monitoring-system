import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle } from "lucide-react";

export function TrendChart({
  title = "Today's Trend — EC (µS/cm)",
  dataKey = "ec",
  unit = "µS/cm",
  threshold = 800,
  warning = "EC exceeded safe threshold (800 µS/cm) at 14:00 — possible heavy metal runoff",
  data,
} = {}) {
  const defaultData = [
    { time: "06:00", ph: 7.1, tds: 210, turbidity: 3.2, ec: 420 },
    { time: "08:00", ph: 7.3, tds: 225, turbidity: 3.8, ec: 445 },
    { time: "10:00", ph: 6.9, tds: 198, turbidity: 2.9, ec: 398 },
    { time: "12:00", ph: 7.6, tds: 310, turbidity: 5.1, ec: 620 },
    { time: "14:00", ph: 8.1, tds: 475, turbidity: 8.4, ec: 950 },
    { time: "16:00", ph: 7.8, tds: 390, turbidity: 6.7, ec: 780 },
    { time: "18:00", ph: 7.4, tds: 280, turbidity: 4.2, ec: 560 },
  ];

  const displayData = data || defaultData;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      {/* Chart */}
      <div className="h-52 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={displayData}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                fontSize: "12px",
                backgroundColor: "#fff",
              }}
              cursor={{ stroke: "#e5e7eb" }}
            />
            <Line
              type="monotone"
              dataKey={dataKey as keyof TrendDataPoint}
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Warning Alert */}
      {warning && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <AlertCircle
            size={18}
            className="text-amber-600 flex-shrink-0 mt-0.5"
          />
          <p className="text-sm text-amber-900">{warning}</p>
        </div>
      )}
    </div>
  );
}
