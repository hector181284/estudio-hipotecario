# 1. Adopción de Clean Architecture, Domain-Driven Design (DDD) y Precisión Decimal

- **Fecha**: 2026-10-18
- **Estado**: Aceptado
- **Decisores**: Usuario, Arquitecto de Software Fintech (`fintech-architect`)
- **Subagente consultado**: `fintech-architect`

## Contexto y Planteamiento del Problema
La plataforma de **Estudio Hipotecario** requiere realizar simulaciones financieras, cuadros de amortización complejos (sistema francés, amortización de capital e intereses), evaluación de solvencia crediticia y scoring de riesgo (ratios LTV, DTI).

Los requisitos clave son:
1. **Precisión matemática absoluta**: En productos financieros a 30 o 40 años, los errores de redondeo por representación en coma flotante estándar (IEEE 754) son inaceptables.
2. **Independencia del framework**: Las reglas del dominio financiero deben estar desacopladas de frameworks web, bases de datos o integraciones externas.
3. **Auditabilidad y cumplimiento normativo**: Capacidad de auditar y reproducir cualquier cálculo o dictamen de viabilidad.

## Factores de Decisión
- Robustez y determinismo en cálculos financieros.
- Facilidad de testeo unitario de la lógica de dominio sin levantar bases de datos ni servicios HTTP.
- Claridad conceptual compartida entre el negocio hipotecario y el equipo de desarrollo (Lenguaje Ubicuo).

## Decisión Adoptada
1. **Clean / Hexagonal Architecture (Ports & Adapters)**:
   - **Domain**: Entidades, Agregados (`SolicitudHipotecaria`), Value Objects inmutables (`Money`, `Percentage`, `PlazoMeses`) y Servicios de Dominio (`CalculadoraAmortizacion`, `MotorScoringViabilidad`). Totalmente agnóstico de frameworks.
   - **Application**: Casos de uso (`SimularEstudioHipotecario`, `EvaluarViabilidadRiesgo`, `CalcularProvisionGastos`) y puertos de entrada/salida.
   - **Infrastructure**: Adaptadores secundarios (PostgreSQL, APIs de tipos de interés Euríbor/BDE, generador de informes PDF).
   - **Presentation/API**: Adaptadores primarios (endpoints REST/OpenAPI, controladores HTTP).
2. **Tipo de Dato Financiero**:
   - Uso obligatorio de tipos de precisión arbitraria (`Decimal`, `BigNumber` o enteros en centavos).
   - Prohibido terminantemente el uso de tipos `float` / `double` en importes monetarios o tipos de interés acumulativos.
3. **Persistencia**:
   - PostgreSQL como base de datos relacional transaccional (tipos `NUMERIC(15, 2)` y `NUMERIC(8, 5)`).

## Consecuencias
### Positivas
- Mantenibilidad y testeabilidad elevada (cobertura del 100% de reglas financieras mediante tests unitarios puros).
- Seguridad regulatoria y cumplimiento de la Ley de Contratos de Crédito Inmobiliario (LCCI).
- Flexibilidad para cambiar o actualizar librerías de infraestructura sin alterar el núcleo de negocio.

### Negativas / Mitigaciones
- Mayor número de archivos y capas iniciales (boilerplate), mitigado mediante una estructura de carpetas modular y plantillas bien definidas.
