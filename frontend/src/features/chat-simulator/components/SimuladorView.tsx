"use client";

import React, { useEffect } from "react";
import { useMortgageStore } from "@/stores/mortgage-simulator.store";
import ChatPanel from "./ChatPanel";
import SimulationCanvas from "@/features/live-canvas/components/SimulationCanvas";
import TopNav from "@/components/layout/TopNav";

export default function SimuladorView() {
  const { runSimulation } = useMortgageStore();

  // Lanza simulación inicial al montar
  useEffect(() => {
    runSimulation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Top Navigation */}
      <TopNav activeTab="simulator" />

      {/* Split-Screen Layout: Chat (42%) | Canvas (58%) */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT: Chat Conversacional */}
        <section className="w-full lg:w-[42%] flex flex-col border-r border-slate-200 bg-slate-50 overflow-hidden">
          <ChatPanel />
        </section>

        {/* RIGHT: Live Canvas de Simulación */}
        <section className="hidden lg:flex flex-col flex-1 bg-white overflow-y-auto">
          <SimulationCanvas />
        </section>
      </main>
    </div>
  );
}
