"use client";

import React from "react";
import ChatPanel from "./ChatPanel";
import SimulationCanvas from "@/features/live-canvas/components/SimulationCanvas";
import TopNav from "@/components/layout/TopNav";

export default function SimuladorView() {
  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Top Navigation */}
      <TopNav activeTab="simulator" />

      {/* Split-Screen Layout: Chat (44%) | Canvas (56%) */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT: Chat Conversacional Paso a Paso */}
        <section className="w-full lg:w-[44%] flex flex-col border-r border-slate-200 bg-white overflow-hidden shadow-xs z-10">
          <ChatPanel />
        </section>

        {/* RIGHT: Live Canvas de Simulación Progresiva */}
        <section className="hidden lg:flex flex-col flex-1 bg-slate-50/60 overflow-y-auto">
          <SimulationCanvas />
        </section>
      </main>
    </div>
  );
}
