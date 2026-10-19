# 2. Selección del Stack Tecnológico y Topología del Equipo de Agentes

- **Fecha**: 2026-10-18
- **Estado**: Aceptado
- **Decisores**: Usuario, `fintech-architect`
- **Subagentes involucrados**: `fintech-architect`, `backend-dev`, `frontend-dev`, `ux-lead`

## Contexto y Planteamiento del Problema
Para implementar la plataforma de **Estudio Hipotecario**, se requiere:
1. Una infraestructura backend robusta para la ejecución de reglas de negocio, cálculos de amortización, evaluación de solvencia y persistencia transaccional.
2. Un frontend con dos experiencias diferenciadas:
   - Un **asistente conversacional (Chat UI)** accesible y amigable para el solicitante de la hipoteca.
   - Un **portal de administración (Backoffice)** para maestros (Euríbor, fiscalidad por CC.AA., políticas bancarias).
3. Una estructura de gobernanza donde la experiencia de usuario (UX) se supervise de manera estricta mediante **Human-In-The-Loop (HITL)** antes de pasar a la fase de desarrollo.

## Factores de Decisión
- **Tipado estricto y contratos compartidos**: El uso de TypeScript de extremo a extremo minimiza desajustes entre frontend y backend mediante DTOs compartidos y validaciones con `Zod`.
- **Ecosistema modular y productivo**: NestJS proporciona soporte nativo para arquitectura hexagonal/modular con Inyección de Dependencias. Next.js 15 permite server-side rendering, streaming y componentes interactivos para simulaciones en tiempo real.
- **Supervisión estrecha del usuario**: La experiencia conversacional es el punto de contacto más sensible con el cliente; requiere iteración y validación humana continua.

## Decisión Adoptada

### 1. Stack Tecnológico Base
- **Monorepo / Estructura**: Separación clara entre `backend/` y `frontend/`.
- **Backend**:
  - Runtime: Node.js / TypeScript.
  - Framework: NestJS (Clean Architecture / Puertos y Adaptadores).
  - Precisión Matemática: `decimal.js` (uso exclusivo para importes, porcentajes, TIN, TAE y amortizaciones).
  - Persistencia: PostgreSQL con tipos `NUMERIC(15,2)` y `NUMERIC(8,5)` mediante Prisma o TypeORM.
  - Documentación API: OpenAPI / Swagger.
- **Frontend**:
  - Framework: Next.js (App Router) + React 19 + TypeScript.
  - Estilos y Componentes: Tailwind CSS + `shadcn/ui` + Lucide Icons.
  - Gráficos Financieros: Recharts (visualización de cuadros de amortización interactivos).
  - Validación de Formularios: React Hook Form + Zod.

### 2. Topología y Roles del Equipo de Agentes
- **`fintech-architect`**: Dictamina la arquitectura técnica, modelos de dominio y ADRs.
- **`backend-dev`**: Implementa la lógica de dominio puro, casos de uso, repositorios y endpoints del backend.
- **`frontend-dev`**: Implementa el chat conversacional y el panel de maestros.
- **`ux-lead`**: Diseña flujos, wireframes y componentes operando bajo protocolo **HITL obligatorio** (no se programa nada sin aprobación explícita del usuario).

## Consecuencias
### Positivas
- Cohesión total en el modelo de datos entre capas gracias a TypeScript.
- Control total del usuario sobre la experiencia de navegación y el tono de voz del asistente conversacional.
- Separación limpia de responsabilidades técnicas y funcionales.
