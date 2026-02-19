import { useRef, useState } from "react";
import type { UploadResponse } from "../types";
import { uploadFile } from "../api";

interface FileUploadProps {
  password: string;
  onUpload: (data: UploadResponse) => void;
}

export default function FileUpload({ password, onUpload }: FileUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleProcess = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const data = await uploadFile(password, file);
      onUpload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="bg-rose-50 p-6 rounded-lg shadow-md max-w-lg w-full">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 text-center">Upload WeChat Export</h2>
        <div className="flex items-center gap-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            onChange={() => setHasFile(!!fileRef.current?.files?.[0])}
            className="flex-1 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-rose-300 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
          />
          <button
            onClick={handleProcess}
            disabled={loading || !hasFile}
            className="px-4 py-2 bg-rose-600 text-white rounded-md border border-rose-700 hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Process"}
          </button>
        </div>
        {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}
      </div>
      <img src="/bubu-dudu-1.jpg" alt="Bubu & Dudu" className="w-56 mt-6 rounded-lg" />
    </div>
  );
}
