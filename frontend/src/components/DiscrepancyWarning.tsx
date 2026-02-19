import { useState } from "react";
import type { Discrepancy } from "../types";

interface DiscrepancyWarningProps {
  discrepancies: Discrepancy[];
}

export default function DiscrepancyWarning({ discrepancies }: DiscrepancyWarningProps) {
  const [expanded, setExpanded] = useState(false);

  if (discrepancies.length === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-yellow-800 font-medium w-full text-left"
      >
        <span>{expanded ? "▼" : "▶"}</span>
        <span>
          {discrepancies.length} discrepanc{discrepancies.length === 1 ? "y" : "ies"} found
        </span>
      </button>
      {expanded && (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-yellow-900">
              <th className="pb-1">Item</th>
              <th className="pb-1">Parsed</th>
              <th className="pb-1">Expected</th>
            </tr>
          </thead>
          <tbody>
            {discrepancies.map((d) => (
              <tr key={d.food_item} className="text-yellow-800">
                <td className="py-0.5">{d.food_item}</td>
                <td className="py-0.5">{d.parsed_total}</td>
                <td className="py-0.5">{d.expected_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
