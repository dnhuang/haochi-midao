import { useState } from "react";
import type { SortedItem } from "../types";
import { downloadLabels } from "../api";
import LabelPreview from "../components/LabelPreview";

interface LabelsPageProps {
  sortedItems: SortedItem[] | null;
  password: string;
}

export default function LabelsPage({ sortedItems, password }: LabelsPageProps) {
  const [downloading, setDownloading] = useState(false);

  if (!sortedItems) {
    return (
      <div className="bg-rose-50 rounded-lg shadow-md p-8 text-center text-gray-400">
        Run an analysis first.
      </div>
    );
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await downloadLabels(password, sortedItems);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "labels.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-rose-50 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Label Preview</h2>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-4 py-2 bg-rose-600 text-white rounded-md border border-rose-700 hover:bg-rose-700 disabled:opacity-50"
        >
          {downloading ? "Generating..." : "Download Labels PDF"}
        </button>
      </div>
      <LabelPreview sortedItems={sortedItems} password={password} />
    </div>
  );
}
