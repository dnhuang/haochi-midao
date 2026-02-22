import { useState } from "react";
import type { UploadResponse, SortedItem, OrderItem } from "./types";
import { useAuth } from "./hooks/useAuth";
import LoginForm from "./components/LoginForm";
import FileUpload from "./components/FileUpload";
import AnalyzePage from "./pages/AnalyzePage";
import LabelsPage from "./pages/LabelsPage";
import RoutingPage from "./pages/RoutingPage";
import PreviewEditPage from "./pages/PreviewEditPage";
import { GROUP_ORDER, GROUP_COLORS_MAP, assignGroup } from "./groupConfig";

type Tab = "analyze" | "labels" | "routing";

const GROUP_COLORS = [
  "#f87171", // red-400
  "#60a5fa", // blue-400
  "#4ade80", // green-400
  "#facc15", // yellow-400
  "#c084fc", // purple-400
  "#fb923c", // orange-400
  "#2dd4bf", // teal-400
  "#f472b6", // pink-400
  "#818cf8", // indigo-400
  "#a3a3a3", // neutral-400
];

function App() {
  const { password, isAuthenticated, login, logout, error, loading } = useAuth();
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [sortedItems, setSortedItems] = useState<SortedItem[] | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [groupColors, setGroupColors] = useState<Record<string, string>>({});
  const [showLabel, setShowLabel] = useState(true);
  const [foodColumnLabels, setFoodColumnLabels] = useState<Record<string, string>>({});

  if (!isAuthenticated || !password) {
    return <LoginForm onLogin={login} error={error} loading={loading} />;
  }

  const handleUpload = (data: UploadResponse) => {
    setUploadData(data);
    setIsConfirmed(false);
    setSortedItems(null);
    setActiveTab("analyze");
    setFoodColumnLabels(data.food_column_labels || {});
    if (data.format === "formatted") {
      // Formatted files: single group "A" for all orders
      const colors: Record<string, string> = { A: GROUP_COLORS[0] };
      setGroupColors(colors);
      setOrders(data.orders.map((o) => ({ ...o, group: "A" })));
      setShowLabel(true);
    } else {
      // Raw files: assign predefined delivery groups by city/zip
      const mapped = data.orders.map((o) => ({
        ...o,
        group: assignGroup(o.city, o.zip_code),
      }));

      // Build groupColors from groups that appear in the data
      const activeGroups = [...new Set(mapped.map((o) => o.group).filter(Boolean))] as string[];
      const colors: Record<string, string> = {};
      // Add predefined groups in display order
      for (const g of GROUP_ORDER) {
        if (activeGroups.includes(g)) {
          colors[g] = GROUP_COLORS_MAP[g];
        }
      }
      // Add any user-added groups (shouldn't happen at upload, but be safe)
      const usedPredefined = new Set(Object.keys(colors));
      for (const g of activeGroups) {
        if (!usedPredefined.has(g)) {
          colors[g] = GROUP_COLORS[Object.keys(colors).length % GROUP_COLORS.length];
        }
      }

      // Sort by predefined group order, then by zip within each group
      const sorted = [...mapped].sort((a, b) => {
        const ga = a.group;
        const gb = b.group;
        if (!ga && !gb) return 0;
        if (!ga) return 1;
        if (!gb) return -1;
        const ia = GROUP_ORDER.indexOf(ga);
        const ib = GROUP_ORDER.indexOf(gb);
        const ra = ia >= 0 ? ia : GROUP_ORDER.length;
        const rb = ib >= 0 ? ib : GROUP_ORDER.length;
        if (ra !== rb) return ra - rb;
        return (a.zip_code || "").localeCompare(b.zip_code || "");
      });

      setGroupColors(colors);
      setOrders(sorted);
      setShowLabel(false);
    }
  };

  const handleReset = () => {
    setUploadData(null);
    setOrders([]);
    setIsConfirmed(false);
    setSortedItems(null);
    setActiveTab("analyze");
    setGroupColors({});
    setShowLabel(true);
    setFoodColumnLabels({});
  };

  const handleBackToPreview = () => {
    setIsConfirmed(false);
    setSortedItems(null);
  };

  const handleLabelChange = (index: number, newLabel: string) => {
    setOrders((prev) => prev.map((o) => (o.index === index ? { ...o, delivery: newLabel } : o)));
  };

  const handleGroupChange = (index: number, group: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.index === index ? { ...o, group: group || undefined } : o)),
    );
  };

  const handleAddGroup = (name: string) => {
    if (groupColors[name]) return;
    const usedColors = new Set(Object.values(groupColors));
    const nextColor = GROUP_COLORS.find((c) => !usedColors.has(c)) || GROUP_COLORS[Object.keys(groupColors).length % GROUP_COLORS.length];
    setGroupColors((prev) => ({ ...prev, [name]: nextColor }));
  };

  const handleDeleteGroup = (name: string) => {
    setGroupColors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setOrders((prev) => prev.map((o) => (o.group === name ? { ...o, group: undefined } : o)));
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    setGroupColors((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k === oldName ? newName : k] = v;
      }
      return next;
    });
    setOrders((prev) =>
      prev.map((o) => (o.group === oldName ? { ...o, group: newName } : o)),
    );
  };

  const handleReorderOrders = (newOrders: OrderItem[]) => {
    setOrders(newOrders);
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
            {(["analyze", "labels", "routing"] as Tab[]).map((tab) => (
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
            groupColors={groupColors}
            onGroupChange={handleGroupChange}
            onAddGroup={handleAddGroup}
            onDeleteGroup={handleDeleteGroup}
            onRenameGroup={handleRenameGroup}
            onReorder={handleReorderOrders}
            showLabel={showLabel}
            onToggleLabel={() => setShowLabel((v) => !v)}
            foodColumnLabels={foodColumnLabels}
          />
        ) : activeTab === "analyze" ? (
          <AnalyzePage
            orders={orders}
            password={password}
            onAnalysis={setSortedItems}
            groupColors={groupColors}
            showLabel={showLabel}
            onToggleLabel={() => setShowLabel((v) => !v)}
            foodColumnLabels={foodColumnLabels}
          />
        ) : activeTab === "labels" ? (
          <LabelsPage sortedItems={sortedItems} password={password} />
        ) : (
          <RoutingPage
            orders={orders}
            password={password}
            groupColors={groupColors}
            showLabel={showLabel}
            onToggleLabel={() => setShowLabel((v) => !v)}
            foodColumnLabels={foodColumnLabels}
          />
        )}
      </main>
    </div>
  );
}

export default App;
