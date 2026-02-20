import { useState } from "react";
import type { OrderItem, RouteResponse } from "../types";
import { routeOrders } from "../api";
import OrderTable from "../components/OrderTable";

interface RoutingPageProps {
  orders: OrderItem[];
  password: string;
}

export default function RoutingPage({ orders, password }: RoutingPageProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoute = async () => {
    if (selected.size === 0) return;
    if (!startAddress.trim() || !endAddress.trim()) {
      setError("Please enter both a start and end address");
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
        endAddress.trim(),
      );
      setRouteResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Routing failed");
    } finally {
      setLoading(false);
    }
  };

  const canRoute =
    selected.size > 0 && startAddress.trim() !== "" && endAddress.trim() !== "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: order table + address inputs */}
      <div>
        <OrderTable
          orders={orders}
          selected={selected}
          onSelectionChange={setSelected}
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

        <div className="mt-4 bg-rose-50 rounded-lg shadow-md p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Route Settings
          </h3>
          <div>
            <label
              htmlFor="start-address"
              className="block text-sm text-gray-600 mb-1"
            >
              Start Address
            </label>
            <input
              id="start-address"
              type="text"
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              placeholder="e.g. 123 Main St, New York, NY 10001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-rose-400"
            />
          </div>
          <div>
            <label
              htmlFor="end-address"
              className="block text-sm text-gray-600 mb-1"
            >
              End Address
            </label>
            <input
              id="end-address"
              type="text"
              value={endAddress}
              onChange={(e) => setEndAddress(e.target.value)}
              placeholder="e.g. 456 Oak Ave, Brooklyn, NY 11201"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-rose-400"
            />
          </div>
        </div>
      </div>

      {/* Right: route results */}
      <div>
        {routeResult ? (
          <div className="bg-rose-50 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Optimized Route
              </h2>
              <span className="text-sm text-gray-500">
                {routeResult.total_stops} stops
              </span>
            </div>
            <div className="space-y-2">
              {routeResult.stops.map((stop) => (
                <div
                  key={stop.stop_number}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    stop.order_index === -1
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
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 rounded-lg shadow-md p-8 text-center text-gray-400">
            Select orders, enter start/end addresses, and click Route
          </div>
        )}
      </div>
    </div>
  );
}
