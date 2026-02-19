import { useState } from "react";
import type { UploadResponse, SortedItem, OrderItem } from "./types";
import { useAuth } from "./hooks/useAuth";
import LoginForm from "./components/LoginForm";
import FileUpload from "./components/FileUpload";
import AnalyzePage from "./pages/AnalyzePage";
import LabelsPage from "./pages/LabelsPage";
import PreviewEditPage from "./pages/PreviewEditPage";

type Tab = "analyze" | "labels";

function App() {
  const { password, isAuthenticated, login, logout, error, loading } = useAuth();
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [sortedItems, setSortedItems] = useState<SortedItem[] | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("analyze");

  if (!isAuthenticated || !password) {
    return <LoginForm onLogin={login} error={error} loading={loading} />;
  }

  const handleUpload = (data: UploadResponse) => {
    setUploadData(data);
    setOrders(data.orders);
    setIsConfirmed(false);
    setSortedItems(null);
    setActiveTab("analyze");
  };

  const handleReset = () => {
    setUploadData(null);
    setOrders([]);
    setIsConfirmed(false);
    setSortedItems(null);
    setActiveTab("analyze");
  };

  const handleBackToPreview = () => {
    setIsConfirmed(false);
    setSortedItems(null);
  };

  const handleLabelChange = (index: number, newLabel: string) => {
    setOrders((prev) => prev.map((o) => (o.index === index ? { ...o, delivery: newLabel } : o)));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center">
        <img
          src="/bubu-and-dudu-2.jpg"
          alt="Bubu & Dudu"
          className="h-10 w-10 rounded-full object-cover cursor-pointer"
          onClick={handleReset}
        />
        <h1 className="text-xl font-bold text-gray-800 flex-1 text-center">好吃米道</h1>
        <div className="flex items-center gap-4">
          {uploadData && isConfirmed && (
            <button onClick={handleBackToPreview} className="text-sm text-gray-700 border border-gray-300 rounded px-3 py-1 hover:bg-rose-600 hover:text-white hover:border-rose-600">
              Back to Preview
            </button>
          )}
          {uploadData && (
            <button onClick={handleReset} className="text-sm text-gray-700 border border-gray-300 rounded px-3 py-1 hover:bg-rose-600 hover:text-white hover:border-rose-600">
              Upload new file
            </button>
          )}
          <button onClick={logout} className="text-sm text-gray-700 border border-gray-300 rounded px-3 py-1 hover:bg-rose-600 hover:text-white hover:border-rose-600">
            Logout
          </button>
        </div>
      </header>

      {/* Tab bar */}
      {isConfirmed && (
        <nav className="bg-rose-50 border-b border-rose-200 px-6">
          <div className="flex gap-6">
            {(["analyze", "labels"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 capitalize ${
                  activeTab === tab
                    ? "border-rose-600 text-rose-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {!uploadData ? (
          <FileUpload password={password} onUpload={handleUpload} />
        ) : !isConfirmed ? (
          <PreviewEditPage
            uploadData={uploadData}
            orders={orders}
            onOrdersChange={setOrders}
            onLabelChange={handleLabelChange}
            password={password}
            onConfirm={() => setIsConfirmed(true)}
          />
        ) : activeTab === "analyze" ? (
          <AnalyzePage
            orders={orders}
            password={password}
            onAnalysis={setSortedItems}
            onLabelChange={handleLabelChange}
          />
        ) : (
          <LabelsPage sortedItems={sortedItems} password={password} />
        )}
      </main>
    </div>
  );
}

export default App;
