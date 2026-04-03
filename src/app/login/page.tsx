"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("帳號或密碼錯誤");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm p-8 bg-bg2 border border-bg3">
        <h1 className="font-display text-xl font-semibold text-center mb-1 tracking-[2px] uppercase">
          <span className="text-accent">Lobster</span>{" "}
          <span className="text-fg">Art</span>
        </h1>
        <p className="font-mono text-[10px] text-fg3 text-center tracking-[2px] uppercase mb-8">
          Admin Panel
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full px-4 py-3 bg-bg border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block font-mono text-[11px] text-fg3 uppercase tracking-[1px] mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-3 bg-bg border border-bg3 text-fg text-sm focus:border-accent outline-none transition-colors"
            />
          </div>
          {error && <p className="font-mono text-[12px] text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent text-white font-mono text-[12px] uppercase tracking-[2px] hover:bg-accent2 disabled:opacity-50 transition-colors"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
