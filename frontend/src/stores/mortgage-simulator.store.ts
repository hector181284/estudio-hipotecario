"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SimularEstudioInputDto, SimularEstudioOutputDto, ViabilityStatus } from "@/types/mortgage";
import { simularEstudio } from "@/lib/api-client";

interface ChatStep {
  id: string;
  type: "bot" | "user";
  content: string;
}

interface MortgageSimulatorState {
  // Parámetros de simulación
  params: SimularEstudioInputDto;
  // Resultado del backend
  result: SimularEstudioOutputDto | null;
  // Estado de la UI
  isLoading: boolean;
  error: string | null;
  activeStep: number;
  chatHistory: ChatStep[];

  // Actions
  setParam: <K extends keyof SimularEstudioInputDto>(
    key: K,
    value: SimularEstudioInputDto[K]
  ) => void;
  setCondicion: <K extends keyof SimularEstudioInputDto["condicion"]>(
    key: K,
    value: SimularEstudioInputDto["condicion"][K]
  ) => void;
  setTitular: <K extends keyof SimularEstudioInputDto["titularPrincipal"]>(
    key: K,
    value: SimularEstudioInputDto["titularPrincipal"][K]
  ) => void;
  runSimulation: () => Promise<void>;
  loadScenario: (type: "viable" | "ltv_alert" | "dti_alert") => void;
  reset: () => void;
}

const DEFAULT_PARAMS: SimularEstudioInputDto = {
  precioInmueble: 250000,
  tipoVivienda: "segunda_mano",
  finalidad: "primera_vivienda",
  comunidadAutonoma: "MD",
  ahorrosAportados: 65000,
  titularPrincipal: {
    nombre: "Titular",
    contrato: "indefinido",
    ingresosNetosMensuales: 3200,
    deudasMensualesVigentes: 0,
  },
  condicion: {
    modalidad: "fijo",
    plazoAnios: 25,
    tinAnual: 2.85,
  },
};

const SCENARIOS = {
  viable: {
    precioInmueble: 240000,
    ahorrosAportados: 65000,
    titularPrincipal: { ...DEFAULT_PARAMS.titularPrincipal, ingresosNetosMensuales: 3600, deudasMensualesVigentes: 0 },
  },
  ltv_alert: {
    precioInmueble: 300000,
    ahorrosAportados: 25000,
    titularPrincipal: { ...DEFAULT_PARAMS.titularPrincipal, ingresosNetosMensuales: 3500, deudasMensualesVigentes: 100 },
  },
  dti_alert: {
    precioInmueble: 200000,
    ahorrosAportados: 50000,
    titularPrincipal: { ...DEFAULT_PARAMS.titularPrincipal, ingresosNetosMensuales: 1800, deudasMensualesVigentes: 450 },
  },
};

export const useMortgageStore = create<MortgageSimulatorState>()(
  persist(
    (set, get) => ({
      params: DEFAULT_PARAMS,
      result: null,
      isLoading: false,
      error: null,
      activeStep: 1,
      chatHistory: [],

      setParam: (key, value) => {
        set((s) => ({ params: { ...s.params, [key]: value } }));
        // Redispara la simulación automáticamente
        setTimeout(() => get().runSimulation(), 50);
      },

      setCondicion: (key, value) => {
        set((s) => ({
          params: {
            ...s.params,
            condicion: { ...s.params.condicion, [key]: value },
          },
        }));
        setTimeout(() => get().runSimulation(), 50);
      },

      setTitular: (key, value) => {
        set((s) => ({
          params: {
            ...s.params,
            titularPrincipal: { ...s.params.titularPrincipal, [key]: value },
          },
        }));
        setTimeout(() => get().runSimulation(), 50);
      },

      runSimulation: async () => {
        const { params } = get();
        set({ isLoading: true, error: null });
        try {
          const result = await simularEstudio(params);
          set({ result, isLoading: false });
        } catch (e: any) {
          set({ error: e.message, isLoading: false });
        }
      },

      loadScenario: (type) => {
        const scenario = SCENARIOS[type];
        set((s) => ({
          params: { ...s.params, ...scenario },
        }));
        setTimeout(() => get().runSimulation(), 50);
      },

      reset: () => {
        set({ params: DEFAULT_PARAMS, result: null, error: null, activeStep: 1 });
        setTimeout(() => get().runSimulation(), 50);
      },
    }),
    { name: "mortgage-simulator-store" }
  )
);
