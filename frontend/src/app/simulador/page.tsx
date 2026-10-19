import type { Metadata } from "next";
import SimuladorView from "@/features/chat-simulator/components/SimuladorView";

export const metadata: Metadata = {
  title: "Simulador Hipotecario | Estudio Hipotecario",
  description: "Analiza la viabilidad de tu hipoteca con nuestro asistente conversacional.",
};

export default function SimuladorPage() {
  return <SimuladorView />;
}
