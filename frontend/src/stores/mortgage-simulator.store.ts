"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SimularEstudioInputDto, SimularEstudioOutputDto } from "@/types/mortgage";
import { simularEstudio } from "@/lib/api-client";

interface MortgageSimulatorState {
  params: SimularEstudioInputDto;
  result: SimularEstudioOutputDto | null;
  isLoading: boolean;
  error: string | null;
  activeStep: number; // Paso actual (1: Propósito, 2: Precio/CCAA, 3: Ahorros, 4: Ingresos, 5: Hipoteca)
  hasCompletedSimulation: boolean; // Indica si el usuario ya llegó al final y calculó

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setParam: <K extends keyof SimularEstudioInputDto>(key: K, value: SimularEstudioInputDto[K]) => void;
  setCondicion: <K extends keyof SimularEstudioInputDto["condicion"]>(key: K, value: SimularEstudioInputDto["condicion"][K]) => void;
  setTitular: <K extends keyof SimularEstudioInputDto["titularPrincipal"]>(key: K, value: SimularEstudioInputDto["titularPrincipal"][K]) => void;
  setCotitular: <K extends keyof NonNullable<SimularEstudioInputDto["cotitular"]>>(key: K, value: NonNullable<SimularEstudioInputDto["cotitular"]>[K]) => void;
  setTieneCotitular: (enabled: boolean) => void;
  runSimulation: () => Promise<void>;
  loadScenario: (type: "viable" | "ltv_alert" | "dti_alert") => void;
  reset: () => void;
}

const DEFAULT_COTITULAR = {
  nombre: "Cotitular",
  contrato: "indefinido" as const,
  ingresosNetosMensuales: 1800,
  deudasMensualesVigentes: 0,
  edad: 32,
  hijosACargo: 0,
};

const DEFAULT_PARAMS: SimularEstudioInputDto = {
  precioInmueble: 250000,
  tipoVivienda: "segunda_mano",
  finalidad: "primera_vivienda",
  comunidadAutonoma: "MD",
  ahorrosAportados: 60000,
  titularPrincipal: {
    nombre: "Titular",
    contrato: "indefinido",
    ingresosNetosMensuales: 3200,
    deudasMensualesVigentes: 0,
    edad: 34,
    hijosACargo: 0,
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
    condicion: { modalidad: "fijo" as const, plazoAnios: 25, tinAnual: 2.75 },
  },
  ltv_alert: {
    precioInmueble: 320000,
    ahorrosAportados: 25000,
    titularPrincipal: { ...DEFAULT_PARAMS.titularPrincipal, ingresosNetosMensuales: 3500, deudasMensualesVigentes: 100 },
    condicion: { modalidad: "fijo" as const, plazoAnios: 25, tinAnual: 2.90 },
  },
  dti_alert: {
    precioInmueble: 200000,
    ahorrosAportados: 50000,
    titularPrincipal: { ...DEFAULT_PARAMS.titularPrincipal, ingresosNetosMensuales: 1700, deudasMensualesVigentes: 450 },
    condicion: { modalidad: "fijo" as const, plazoAnios: 25, tinAnual: 3.10 },
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
      hasCompletedSimulation: false,

      setStep: (step) => set({ activeStep: step }),

      nextStep: () => {
        const current = get().activeStep;
        if (current < 5) {
          set({ activeStep: current + 1 });
        } else {
          // Al completar el paso 5, activa la simulación completa
          set({ hasCompletedSimulation: true });
          get().runSimulation();
        }
      },

      prevStep: () => {
        const current = get().activeStep;
        if (current > 1) {
          set({ activeStep: current - 1 });
        }
      },

      setParam: (key, value) => {
        set((s) => ({ params: { ...s.params, [key]: value } }));
        // Si ya completó la simulación una vez, recalcula en vivo
        if (get().hasCompletedSimulation) {
          setTimeout(() => get().runSimulation(), 60);
        }
      },

      setCondicion: (key, value) => {
        set((s) => ({
          params: {
            ...s.params,
            condicion: { ...s.params.condicion, [key]: value },
          },
        }));
        if (get().hasCompletedSimulation) {
          setTimeout(() => get().runSimulation(), 60);
        }
      },

      setTitular: (key, value) => {
        set((s) => ({
          params: {
            ...s.params,
            titularPrincipal: { ...s.params.titularPrincipal, [key]: value },
          },
        }));
        if (get().hasCompletedSimulation) {
          setTimeout(() => get().runSimulation(), 60);
        }
      },

      setTieneCotitular: (enabled: boolean) => {
        set((s) => {
          if (!enabled) {
            const nextParams = { ...s.params };
            delete nextParams.cotitular;
            return { params: nextParams };
          }
          return {
            params: {
              ...s.params,
              cotitular: s.params.cotitular ?? { ...DEFAULT_COTITULAR },
            },
          };
        });
        if (get().hasCompletedSimulation) {
          setTimeout(() => get().runSimulation(), 60);
        }
      },

      setCotitular: (key, value) => {
        set((s) => ({
          params: {
            ...s.params,
            cotitular: {
              ...(s.params.cotitular ?? DEFAULT_COTITULAR),
              [key]: value,
            },
          },
        }));
        if (get().hasCompletedSimulation) {
          setTimeout(() => get().runSimulation(), 60);
        }
      },

      runSimulation: async () => {
        const { params } = get();
        set({ isLoading: true, error: null });
        try {
          const result = await simularEstudio(params);
          set({ result, isLoading: false, hasCompletedSimulation: true });
        } catch (e: any) {
          set({ error: e.message, isLoading: false });
        }
      },

      loadScenario: (type) => {
        const scenario = SCENARIOS[type];
        set((s) => ({
          params: { ...s.params, ...scenario },
          activeStep: 5,
          hasCompletedSimulation: true,
        }));
        setTimeout(() => get().runSimulation(), 50);
      },

      reset: () => {
        set({
          params: DEFAULT_PARAMS,
          result: null,
          error: null,
          activeStep: 1,
          hasCompletedSimulation: false,
        });
      },
    }),
    { name: "mortgage-simulator-store" }
  )
);
