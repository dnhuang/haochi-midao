import { useState } from "react";

interface LoginFormProps {
  onLogin: (password: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

export default function LoginForm({ onLogin, error, loading }: LoginFormProps) {
  const [pw, setPw] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.trim()) {
      onLogin(pw.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <img src="/dudu.jpg" alt="Dudu" className="w-36 mb-4 rounded-full" />
      <form onSubmit={handleSubmit} className="bg-rose-50 p-8 rounded-lg shadow-md w-80">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">好吃米道</h1>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-rose-400"
          autoFocus
        />
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pw.trim()}
          className="w-full py-2 bg-rose-600 text-white rounded-md border border-rose-700 hover:bg-rose-700 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Login"}
        </button>
      </form>
    </div>
  );
}
