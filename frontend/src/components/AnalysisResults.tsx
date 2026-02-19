import { useState } from "react";
import type { AnalyzeResponse } from "../types";

interface AnalysisResultsProps {
  data: AnalyzeResponse;
}

type ResultTab = "items" | "summary" | "report";

export default function AnalysisResults({ data }: AnalysisResultsProps) {
  const [tab, setTab] = useState<ResultTab>("items");

  const maxQty = data.sorted_items.length > 0 ? data.sorted_items[0].quantity : 1;

  const csvContent = [
    "Item,Quantity",
    ...data.sorted_items.map((i) => `"${i.item_name}",${i.quantity}`),
  ].join("\n");

  const reportContent = [
    `Orders analyzed: ${data.orders_analyzed}`,
    `Unique items: ${data.sorted_items.length}`,
    `Total items: ${data.total_items}`,
    "",
    "Item Breakdown:",
    ...data.sorted_items.map((i) => `  ${i.item_name}: ${i.quantity}`),
  ].join("\n");

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-rose-50 rounded-lg shadow-md">
      {/* Result sub-tabs */}
      <div className="border-b border-gray-200 px-4">
        <div className="flex gap-4">
          {(["items", "summary", "report"] as ResultTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 text-sm font-medium border-b-2 capitalize ${
                tab === t
                  ? "border-rose-600 text-rose-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "items" ? "Item List" : t === "summary" ? "Summary" : "Report"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {tab === "items" && (
          <div>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => download(csvContent, "analysis.csv", "text/csv")}
                className="text-sm text-gray-700 border border-gray-300 rounded px-2 py-0.5 hover:bg-rose-600 hover:text-white hover:border-rose-600"
              >
                Download CSV
              </button>
            </div>
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-1.5 text-left text-gray-600 w-10 select-none"></th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left text-gray-600">Food Item</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-right text-gray-600 w-24">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {data.sorted_items.map((item, i) => (
                  <tr key={item.item_name} className="even:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-1.5 text-gray-400 text-right select-none">{i + 1}</td>
                    <td className="border border-gray-300 px-3 py-1.5">{item.item_name}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-right">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "summary" && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-rose-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-rose-700">{data.orders_analyzed}</div>
                <div className="text-sm text-rose-600">Orders</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{data.sorted_items.length}</div>
                <div className="text-sm text-green-600">Unique Items</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-700">{data.total_items}</div>
                <div className="text-sm text-purple-600">Total Items</div>
              </div>
            </div>
            {/* CSS bar chart */}
            <div className="space-y-2">
              {data.sorted_items.map((item) => (
                <div key={item.item_name} className="flex items-center gap-3">
                  <div className="w-40 text-sm text-right truncate">{item.item_name}</div>
                  <div className="flex-1 bg-gray-100 rounded h-6">
                    <div
                      className="bg-rose-400 h-6 rounded flex items-center justify-end pr-2"
                      style={{ width: `${(item.quantity / maxQty) * 100}%` }}
                    >
                      <span className="text-xs text-white font-medium">{item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "report" && (
          <div>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => download(reportContent, "report.txt", "text/plain")}
                className="text-sm text-gray-700 border border-gray-300 rounded px-2 py-0.5 hover:bg-rose-600 hover:text-white hover:border-rose-600"
              >
                Download Report
              </button>
            </div>
            <pre className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap">{reportContent}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
