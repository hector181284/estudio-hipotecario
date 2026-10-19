# 4. Arquitectura Frontend, Selección Tecnológica y Estrategia de Prototipado

- **Fecha**: 2026-10-18
- **Estado**: Aceptado
- **Decisores**: Usuario, `frontend_dev`, `fintech-architect`, `ux_lead`
- **Subagente redactor**: `frontend_dev`

## Contexto y Planteamiento del Problema
Para materializar el asistente conversacional interactivo y el portal de maestros de **Estudio Hipotecario** (conforme a las decisiones HITL de [ADR-0003](file:///c:/Users/yodi-hec/Desktop/repo/estudio-hipotecario/docs/architecture/decisions/ADR-0003-experiencia-ux-hitl-y-portal-maestros.md)), se necesita un stack de frontend que soporte:
1. Una experiencia de captación con alto rendimiento y cero latencia perceptible en móvil y escritorio.
2. Sincronización de estado bidireccional reactiva entre el hilo del chat y el canvas lateral de simulación viva.
3. Precisión decimal matemática obligatoria en el cliente para cálculos en vivo.
4. Un portal administrativo privado con Server Components para gestión de tablas maestras.
5. Una estrategia de prototipado interactivo inmediato para validar la experiencia de usuario bajo el protocolo HITL.

## Factores de Decisión
- **Rendimiento y SEO**: Next.js (App Router) permite Server-Side Rendering y streaming para la captación, junto con Server Components para el backoffice sin cascada de peticiones cliente.
- **Microinteracciones y Accesibilidad**: Tailwind CSS + `shadcn/ui` sobre primitivas de Radix UI garantizan control total del código fuente, cero sobrecarga en runtime y cumplimiento WCAG 2.1 AA.
- **Rendimiento de Estado**: Zustand evita re-renderizados innecesarios del chat al mover sliders en el canvas interactivo.
- **Visualización Financiera**: Recharts proporciona componentes SVG declarativos y reactivos para visualizar la curva de amortización francesa y el desglose de costes.

## Decisión Adoptada

### 1. Stack Tecnológico Frontend
- **Framework**: **Next.js 15 (App Router)** con **React 19** y **TypeScript** en modo estricto.
- **Librería de Componentes & Estilos**: **Tailwind CSS** + componentes **shadcn/ui** (Radix UI).
- **Gestor de Estado Global**: **Zustand** con middleware de persistencia para mantener el progreso del solicitante.
- **Gráficos Financieros**: **Recharts** (curva de amortización francesa de capital vs intereses y desglose de costes).
- **Formularios y Validación**: **React Hook Form** + **Zod** con transformación a precisión decimal fija.
- **Iconografía**: **Lucide React**.

### 2. Estructura de Carpetas (Feature-Sliced Modular)
- `src/app/(applicant)/`: Rutas de la experiencia del solicitante (Split-Screen en desktop, chat fluido en móvil).
- `src/app/(admin)/`: Rutas del portal administrativo de maestros (Euríbor, políticas de riesgo, fiscalidad por CC.AA.).
- `src/features/chat-simulator/`: Componentes y widgets conversacionales integrados en burbujas.
- `src/features/live-canvas/`: Métricas en tiempo real, termómetros LTV/DTI y cuadro de amortización.
- `src/features/backoffice/`: Formularios y tablas maestras para parametrización bancaria.
- `src/features/calculation-engine/`: Motor financiero cliente determinista (amortización francesa, ITP/AJD).
- `src/stores/`: Stores Zustand (`mortgage-simulator.store.ts`, `chat-session.store.ts`).

### 3. Estrategia de Prototipado Interactivo
- **Prototipo Autónomo en Vivo**: Se proporciona un prototipo interactivo ejecutable directamente (`frontend/prototype/index.html`) con selector rápido de escenarios de prueba (Viable, Alerta LTV, Alerta DTI) para validar el diseño inmediatamente en cualquier navegador sin dependencias de instalación previas.
- **Motor Financiero Cliente**: Cálculos locales instantáneos que simulan la respuesta del backend para pruebas de usabilidad y feedback de usuarios.

## Consecuencias
- Interfaz reactiva fluida tanto en dispositivos móviles como en pantallas panorámicas.
- Facilidad para evolucionar componentes aisladamente gracias a la arquitectura por features.
