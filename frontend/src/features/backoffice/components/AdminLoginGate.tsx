"use client";

import React, { useState, useEffect } from "react";
import TopNav from "@/components/layout/TopNav";

const SESSION_KEY = "eh_admin_authenticated";
const ADMIN_USER = process.env.NEXT_PUBLIC_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || "admin1234";

interface Props {
  children: React.ReactNode;
}

export default function AdminLoginGate({ children }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const isAuth = sessionStorage.getItem(SESSION_KEY) === "true";
    setIsAuthenticated(isAuth);
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    setTimeout(() => {
      if (usuario.trim() === ADMIN_USER && password === ADMIN_PASS) {
        sessionStorage.setItem(SESSION_KEY, "true");
        setIsAuthenticated(true);
      } else {
        setError("Credenciales incorrectas. Verifique el usuario y la contraseña.");
      }
      setCargando(false);
    }, 400);
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setUsuario("");
    setPassword("");
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between">
      <TopNav activeTab="admin" />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-3xl p-8 shadow-2xl animate-in fade-in duration-300">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">
              🔒
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Portal de Maestros y Gestión</h1>
            <p className="text-xs text-slate-400 mt-1">
              Acceso restringido a administradores de políticas de riesgo, Euríbor y tablas fiscales.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Usuario administrador
              </label>
              <input
                type="text"
                autoFocus
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="ej. admin"
                className="w-full text-sm font-medium bg-slate-900/90 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm font-medium bg-slate-900/90 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-blue-900/30 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {cargando ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verificando credenciales…
                </>
              ) : (
                <>
                  <span>🔑</span> Acceder al Backoffice
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
            <p className="text-[11px] text-slate-500">
              Credenciales por defecto: <span className="font-mono text-slate-400">admin</span> / <span className="font-mono text-slate-400">admin1234</span>
            </p>
          </div>
        </div>
      </div>

      <div className="py-4 text-center text-xs text-slate-600">
        Plataforma Estudio Hipotecario · Sistema de Control de Riesgos
      </div>
    </div>
  );
}
