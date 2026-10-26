import type { Metadata } from "next";
import AdminView from "@/features/backoffice/components/AdminView";
import AdminLoginGate from "@/features/backoffice/components/AdminLoginGate";

export const metadata: Metadata = {
  title: "Portal de Maestros | Estudio Hipotecario",
  description: "Gestión de políticas de riesgo, índices Euríbor y tablas fiscales autonómicas.",
};

export default function AdminPage() {
  return (
    <AdminLoginGate>
      <AdminView />
    </AdminLoginGate>
  );
}
