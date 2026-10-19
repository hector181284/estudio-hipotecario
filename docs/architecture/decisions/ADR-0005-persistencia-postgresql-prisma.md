# ADR-0005: Persistencia PostgreSQL con Prisma ORM

| Campo | Valor |
|---|---|
| **Estado** | ✅ Aceptado |
| **Fecha** | 2026-10-19 |
| **Autores** | fintech-architect, backend-dev |
| **Revisores** | Equipo técnico |

---

## Contexto

El dominio de cálculo hipotecario estaba funcionando de forma puramente en memoria (sin persistencia). Para cumplir los requisitos del producto necesitamos:

1. **Guardar estudios hipotecarios** para recuperarlos más tarde (historial del usuario)
2. **Persistir políticas de riesgo** (LTV/DTI) que el administrador puede modificar desde el backoffice sin redeploy
3. **Mantener el histórico Euribor** para cálculos de hipotecas variables
4. **Almacenar las tablas fiscales autonómicas** (ITP/AJD por CCAA) de forma configurable

La arquitectura existente (Clean Architecture) requiere que la persistencia sea un detalle de infraestructura, oculto detrás de interfaces (puertos) definidas en el dominio.

---

## Decisión

### ORM: **Prisma**
### Base de datos: **PostgreSQL 16**

Prisma actúa como el adaptador de la capa de infraestructura, implementando los puertos `IEstudioRepository`, `IPoliticaRiesgoRepository`, `IEuriborRepository` e `ITablaTributosRepository`.

### Alternativas consideradas

| Opción | Ventajas | Desventajas | Decisión |
|---|---|---|---|
| **Prisma** | Tipos TS generados, migrations declarativas, Decimal nativo, DX excelente | Genera código, no es SQL puro | ✅ **Seleccionado** |
| Drizzle ORM | Más cercano a SQL, muy ligero, TS nativo | Ecosystem más joven, menos documentación de Decimal | Descartado |
| TypeORM | Maduro, decoradores | Complejidad, problemas de tipos TS estrictos | Descartado |
| SQL puro (pg) | Control total | Boilerplate elevado, sin migrations automáticas | Descartado |

---

## Implementación

### Estructura de capas

```
backend/
├── prisma/
│   ├── schema.prisma          ← Definición del modelo relacional
│   └── seed.ts                ← Datos iniciales (política, euribor, tributos)
│
└── src/
    ├── core/
    │   └── domain/
    │       └── ports/         ← Interfaces (contratos del dominio)
    │           ├── IEstudioRepository.ts
    │           ├── IPoliticaRiesgoRepository.ts
    │           ├── IEuriborRepository.ts
    │           └── ITablaTributosRepository.ts
    │
    └── infrastructure/
        └── database/
            ├── prisma-client.ts        ← Singleton PrismaClient
            └── repositories/          ← Implementaciones Prisma
                ├── PrismaEstudioRepository.ts
                ├── PrismaPoliticaRiesgoRepository.ts
                ├── PrismaEuriborRepository.ts
                └── PrismaTablaTributosRepository.ts
```

### Modelo de datos

```mermaid
erDiagram
    EstudioHipotecario {
        uuid id PK
        decimal precioInmueble
        decimal valorTasacion
        string tipoVivienda
        string finalidad
        string comunidadAutonoma
        decimal ahorrosAportados
        string modalidad
        int plazoAnios
        decimal tinAnual
        string semaforo
        decimal cuotaMensual
        decimal capitalPrestado
        decimal ratioLtv
        decimal ratioDti
        string[] alertas
        string[] recomendaciones
        datetime creadoEn
    }

    Participante {
        uuid id PK
        uuid estudioId FK
        string rol
        string nombre
        string contrato
        decimal ingresosNetosMensuales
        decimal deudasMensualesVigentes
    }

    PoliticaRiesgo {
        string id PK
        decimal ltvMaximo
        decimal dtiMaximo
        decimal ltvAlerta
        decimal dtiAlerta
        int plazoMaxAnios
        decimal ahorrosMinPct
    }

    RegistroEuribor {
        uuid id PK
        datetime fecha UK
        decimal valor
    }

    TablaTributosCcaa {
        string codigoCcaa PK
        string nombre
        decimal itpPct
        decimal ajdPct
    }

    EstudioHipotecario ||--o{ Participante : "tiene"
```

### Precisión decimal

> [!IMPORTANT]
> Todos los campos monetarios y porcentuales usan `@db.Decimal(18,2)` o `@db.Decimal(8,4)` respectivamente. Prisma los devuelve como objetos `Decimal` de la lib `decimal.js` compatible. Nunca se usa `Float` de PostgreSQL.

---

## Degradación elegante (Graceful Degradation)

El servidor HTTP arranca **aunque PostgreSQL no esté disponible**. Si la conexión falla:
- El endpoint `POST /api/v1/simular` sigue funcionando (cálculos en memoria)
- Los endpoints `GET /api/v1/estudios/*` devuelven `503 Service Unavailable`
- Se loggea el error pero no se lanza excepción en el startup

Esto permite desarrollar y testear el motor de cálculo sin necesidad de una BD local.

---

## Endpoints nuevos añadidos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/estudios` | Lista paginada de estudios (`?limit=20&offset=0`) |
| `GET` | `/api/v1/estudios/:id` | Detalle de un estudio por UUID |

---

## Consecuencias

### Positivas
- Los datos persisten entre reinicios del servidor
- El administrador puede cambiar LTV/DTI desde el backoffice y afecta a nuevas simulaciones
- Euribor actualizable sin redeploy
- Base para implementar PDF export (necesita el id del estudio guardado)
- Base para autenticación (asociar estudios a usuarios)

### Negativas / Riesgos
- Requiere PostgreSQL ≥14 en producción
- El schema de Prisma genera código — cambios de schema requieren regenerar el cliente
- Las migraciones deben ejecutarse explícitamente en CI/CD

---

## Instrucciones de puesta en marcha

### Con Docker (recomendado para desarrollo)
```bash
docker run --name estudio-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=estudio_hipotecario \
  -p 5432:5432 \
  -d postgres:16
```

### Migraciones y seed
```powershell
cd backend
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

# Aplicar schema a la BD
npx.cmd prisma migrate dev --name init

# Cargar datos iniciales
npm.cmd run db:seed

# Explorar la BD en browser
npm.cmd run db:studio
```

### Variables de entorno
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/estudio_hipotecario?schema=public"
NODE_ENV=development
PORT=4000
```
