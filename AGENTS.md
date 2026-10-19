# Reglas del Proyecto: Estudio Hipotecario

Este repositorio contiene la plataforma para el análisis, cálculo y simulación de viabilidad de préstamos hipotecarios (**Estudio Hipotecario**).

---

## Equipo de Agentes Especializados

El proyecto cuenta con un equipo de subagentes especializados organizados según el principio de separación de responsabilidades:

| Agente | Archivo de Configuración | Rol Principal |
| :--- | :--- | :--- |
| **`fintech-architect`** | [`.agents/agents/fintech-architect.md`](file:///c:/Users/yodi-hec/Desktop/repo/estudio-hipotecario/.agents/agents/fintech-architect.md) | **Arquitecto de Software Fintech**: Diseño de arquitectura Clean/Hexagonal, DDD, definición de modelos, selección de tecnologías y redacción de ADRs. |
| **`backend-dev`** | [`.agents/agents/backend-dev.md`](file:///c:/Users/yodi-hec/Desktop/repo/estudio-hipotecario/.agents/agents/backend-dev.md) | **Senior Backend Developer**: Implementación del núcleo de dominio, cálculos financieros deterministas, casos de uso, persistencia PostgreSQL y APIs REST/OpenAPI siguiendo las directrices del arquitecto. |
| **`frontend-dev`** | [`.agents/agents/frontend-dev.md`](file:///c:/Users/yodi-hec/Desktop/repo/estudio-hipotecario/.agents/agents/frontend-dev.md) | **Senior Frontend Developer**: Implementación del chat conversacional interactivo para el estudio hipotecario y del portal administrativo de maestros y configuraciones (Next.js, Tailwind CSS, shadcn/ui). |
| **`ux-lead`** | [`.agents/agents/ux-lead.md`](file:///c:/Users/yodi-hec/Desktop/repo/estudio-hipotecario/.agents/agents/ux-lead.md) | **UX Lead & Product Designer (HITL Obligatorio)**: Diseño de la experiencia conversacional, flujos, wireframes y ergonomía del backoffice. Opera con supervisión humana continua (**Human-In-The-Loop**) antes de pasar especificaciones a desarrollo. |

---

## Principios Técnicos Fundamentales
1. **Precisión Financiera Obligatoria**:
   - Todo cálculo de dinero, cuotas, intereses (TIN/TAE) y ratios debe realizarse con tipos decimales de precisión arbitraria (`Decimal`, `BigNumber` o representación entera en céntimos).
   - Queda terminantemente prohibido el uso de flotantes binarios (`float`, `double` estándar IEEE 754) para cantidades monetarias o porcentajes acumulativos.
2. **Arquitectura Limpia y Modular**:
   - El núcleo de dominio (cálculos de amortización francesa, fórmulas de cuota, reglas de endeudamiento LTV/DTI) debe ser agnóstico del framework y de la base de datos.
   - Las integraciones externas (APIs de tipos de interés, CIRBE, exportación PDF/Excel) deben residir en la capa de infraestructura detrás de interfaces (puertos y adaptadores).
3. **Protocolo HITL en UX**:
   - Ningún diseño visual o flujo conversacional se implementa sin la revisión, feedback y validación explícita del usuario humano.
4. **Documentación de Decisiones (ADRs)**:
   - Toda decisión arquitectónica o de stack tecnológico debe registrarse en `docs/architecture/decisions/` con el formato estándar ADR.
