# 3. Diseño de la Experiencia Conversacional HITL y Alcance del Portal de Maestros

- **Fecha**: 2026-10-18
- **Estado**: Aceptado
- **Decisores**: Usuario Humano (HITL Sign-Off), `ux_lead`, `fintech-architect`
- **Subagentes involucrados**: `ux_lead`, `frontend_dev`, `backend_dev`

## Contexto y Planteamiento del Problema
La plataforma **Estudio Hipotecario** requiere una interfaz conversacional amigable para capturar información financiera y ofrecer estimaciones en tiempo real, junto con un portal administrativo para gestionar las reglas maestras de cálculo.
Bajo el principio de **Human-In-The-Loop (HITL)**, el usuario humano ha evaluado y decidido directamente los paradigmas de interacción, el modelo de captura de leads y el perímetro del backoffice.

## Factores de Decisión
- Minimizar el abandono en dispositivos móviles mediante interacción limpia.
- Ofrecer retroalimentación instantánea ("efecto co-piloto") en pantallas grandes de escritorio.
- Evitar barreras de fricción prematuras (no forzar captura de datos personales antes de aportar valor al usuario).
- Centrar los recursos del backoffice en la parametrización de reglas de negocio y cálculo sin sobreingeniería inicial de CRM.

## Decisiones Aprobadas (HITL Sign-Off)
1. **Paradigma de Interacción Híbrido Adaptativo**:
   - **Desktop**: Split-Screen interactivo (chat interactivo a la izquierda + canvas visual reactivo en tiempo real a la derecha con semáforo LTV/DTI, cuota y curva de amortización).
   - **Mobile**: Chat guiado secuencial de columna única con drawer colapsable para consultar el estado del estudio.
2. **Lead Gate al Cierre**:
   - Todo el proceso de simulación, cálculo de cuota y semáforo es abierto y anónimo.
   - La captura de datos de contacto se reserva exclusivamente para la exportación del informe en PDF o la solicitud de llamada con asesor.
3. **Alcance del Portal de Maestros**:
   - Acotado exclusivamente a la **configuración paramétrica**:
     - Políticas de riesgo (límites LTV y DTI).
     - Tipos de interés e índices oficiales (Euríbor, TIN, diferenciales).
     - Tablas impositivas y aranceles autonómicos (ITP, AJD, notaría y registro).

## Consecuencias
- `frontend_dev` implementará componentes modulares reutilizables entre el modo Split-Screen y el modo móvil vertical.
- `backend_dev` expondrá endpoints públicos de simulación sin autenticación previa y endpoints protegidos para la parametrización de maestros en `/admin`.
