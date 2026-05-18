import { useState, useEffect, useRef } from "react";
import type { OrderItem, SortedItem, AnalyzeResponse } from "../types";
import { analyzeOrders } from "../api";
import OrderTable from "../components/OrderTable";
import AnalysisResults from "../components/AnalysisResults";
import Spinner from "../components/Spinner";

interface AnalyzePageProps {
  orders: OrderItem[];
  password: string;
  onAnalysis: (items: SortedItem[]) => void;
  groupColors: Record<string, string>;
  showLabel?: boolean;
  onToggleLabel?: () => void;
  foodColumnLabels?: Record<string, string>;
}

export default function AnalyzePage({
  orders,
  password,
  onAnalysis,
  groupColors,
  showLabel,
  onToggleLabel,
  foodColumnLabels,
}: AnalyzePageProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); };
  }, []);

  const handleAnalyze = async () => {
    if (selected.size === 0) return;

    const selectedOrders = orders
      .filter((o) => selected.has(o.index))
      .map((o) => o.item_quantities);

    setLoading(true);
    setError(null);
    try {
      const data = await analyzeOrders(password, selectedOrders);
      setResults(data);
      onAnalysis(data.sorted_items);
      setShowSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setShowSuccess(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = (name: string) => {
    const groupIndices = orders.filter((o) => o.group === name).map((o) => o.index);
    setSelected(new Set(groupIndices));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: order table */}
      <div>
        <OrderTable
          orders={orders}
          selected={selected}
          onSelectionChange={setSelected}
          groupColors={groupColors}
          onSelectGroup={handleSelectGroup}
          showLabel={showLabel}
          onToggleLabel={onToggleLabel}
          compact
          foodColumnLabels={foodColumnLabels}
          toolbarAction={
            <div className="flex items-center gap-3">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              {showSuccess && (
                <span className="animate-success-flash text-sm text-green-700">Done!</span>
              )}
              <button
                onClick={handleAnalyze}
                disabled={selected.size === 0 || loading}
                className="px-5 py-0.5 bg-rose-600 text-white text-sm rounded border border-rose-700 hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? <><Spinner className="inline mr-1.5" />Analyzing...</> : "Analyze"}
              </button>
            </div>
          }
        />
      </div>

      {/* Right: results */}
      <div>
        {results ? (
          <AnalysisResults data={results} foodColumnLabels={foodColumnLabels} />
        ) : (
          <div className="bg-rose-50 rounded-lg shadow-md p-8 text-center text-gray-400">
            Select orders and click Analyze to see results
          </div>
        )}
      </div>
    </div>
  );
}
