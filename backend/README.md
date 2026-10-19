# Backend: Estudio Hipotecario

Servicio backend de cálculo, simulación y gestión de estudios hipotecarios basado en **NestJS** y **Clean Architecture**.

## Estructura de Capas
- `src/core/domain/`: Entidades puras, Value Objects (`Money`, `Percentage`), y servicios de cálculo (amortización francesa, ratios LTV/DTI).
- `src/core/application/`: Casos de uso de simulación y evaluación de riesgo, puertos e interfaces.
- `src/infrastructure/`: Adaptadores secundarios (PostgreSQL, APIs externas de Euríbor).
- `src/presentation/`: Controladores REST y documentación OpenAPI.
