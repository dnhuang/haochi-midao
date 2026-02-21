import { useState } from "react";
import type { OrderItem, RouteResponse } from "../types";
import { routeOrders } from "../api";
import OrderTable from "../components/OrderTable";

const DEFAULT_START_ADDRESS = "2812 Pelican Drive, Union City, CA 94587";

/** Round minutes up to next 5-min boundary, but if on or exactly 1 below a boundary, skip to next. */
function roundMinutes(minutes: number): number {
  const rounded = Math.ceil(minutes / 5) * 5;
  if (rounded - minutes <= 1) return rounded + 5;
  return rounded;
}

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

interface RoutingPageProps {
  orders: OrderItem[];
  password: string;
  groupColors: Record<string, string>;
}

export default function RoutingPage({ orders, password, groupColors }: RoutingPageProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [startAddress, setStartAddress] = useState(DEFAULT_START_ADDRESS);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("08:00");
  const [showActual, setShowActual] = useState(false);

  const handleRoute = async () => {
    if (selected.size === 0) return;
    if (!startAddress.trim()) {
      setError("Please enter a start address");
      return;
    }

    const selectedOrders = orders
      .filter((o) => selected.has(o.index))
      .map((o) => ({
        index: o.index,
        customer: o.customer,
        address: o.address,
        city: o.city,
        zip_code: o.zip_code,
      }));

    setLoading(true);
    setError(null);
    try {
      const data = await routeOrders(
        password,
        selectedOrders,
        startAddress.trim(),
      );
      setRouteResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Routing failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = (name: string) => {
    const groupIndices = orders.filter((o) => o.group === name).map((o) => o.index);
    setSelected(new Set(groupIndices));
  };

  const canRoute = selected.size > 0 && startAddress.trim() !== "";

  // Parse start time into total minutes from midnight
  const [startH, startM] = startTime.split(":").map(Number);
  const startTotalMinutes = (startH || 0) * 60 + (startM || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: start address + order table */}
      <div>
        <div className="mb-4 bg-rose-50 rounded-lg shadow-md p-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label
                htmlFor="start-address"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Start Address
              </label>
              <input
                id="start-address"
                type="text"
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                placeholder="e.g. 123 Main St, City, ST 00000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-rose-400"
              />
            </div>
            <div className="flex-shrink-0">
              <label
                htmlFor="start-time"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Start Time
              </label>
              <input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-rose-400"
              />
            </div>
          </div>
        </div>

        <OrderTable
          orders={orders}
          selected={selected}
          onSelectionChange={setSelected}
          groupColors={groupColors}
          onSelectGroup={handleSelectGroup}
          toolbarAction={
            <div className="flex items-center gap-3">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                onClick={handleRoute}
                disabled={!canRoute || loading}
                className="px-5 py-0.5 bg-rose-600 text-white text-sm rounded border border-rose-700 hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "Routing..." : "Route"}
              </button>
            </div>
          }
        />
      </div>

      {/* Right: route results */}
      <div>
        {routeResult ? (
          <div className="bg-rose-50 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Optimized Route
              </h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showActual}
                    onChange={(e) => setShowActual(e.target.checked)}
                    className="accent-rose-600"
                  />
                  Show actual
                </label>
                <span className="text-sm text-gray-500">
                  {routeResult.total_stops} stops
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {(() => {
                let cumulativeMinutes = 0;
                return routeResult.stops.map((stop) => {
                    const actualMinutes = Math.round(stop.duration_seconds / 60);
                    const rounded = roundMinutes(actualMinutes);
                    cumulativeMinutes += rounded;
                    const arrivalTime = startTotalMinutes + cumulativeMinutes;
                    const isStart = stop.order_index === -1;

                    return (
                      <div
                        key={stop.stop_number}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          isStart
                            ? "bg-gray-50 border-gray-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-600 text-white text-sm flex items-center justify-center font-medium">
                          {stop.stop_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 text-sm">
                            {stop.customer}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {stop.address}
                            {stop.city && `, ${stop.city}`}
                            {stop.zip_code && ` ${stop.zip_code}`}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right text-sm">
                          {isStart ? (
                            <span className="text-gray-600 font-medium">
                              {formatTime(startTotalMinutes)}
                            </span>
                          ) : (
                            <>
                              <div className="text-gray-400">
                                {rounded}
                                {showActual && ` (${actualMinutes})`} min
                              </div>
                              <div className="text-gray-600 font-medium">
                                {formatTime(arrivalTime)}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 rounded-lg shadow-md p-8 text-center text-gray-400">
            Select orders and click Route to optimize delivery order
          </div>
        )}
      </div>
    </div>
  );
}
