import http from "node:http";
import { SimularEstudioHipotecarioUseCase, SimularEstudioInputDto } from "../core/application/use-cases/SimularEstudioHipotecarioUseCase.js";
import { prisma } from "../infrastructure/database/prisma-client.js";
import { PrismaEstudioRepository } from "../infrastructure/database/repositories/PrismaEstudioRepository.js";

const PORT = process.env.PORT || 4000;

// Intentar conectar a BD de forma no bloqueante
let bdDisponible = false;
prisma.$connect()
  .then(() => {
    bdDisponible = true;
    console.log("✅ [BD] Conexión PostgreSQL establecida");
  })
  .catch((err: unknown) => {
    console.warn("⚠️  [BD] PostgreSQL no disponible — modo sin persistencia activo:", (err as Error).message);
  });

const estudioRepository = new PrismaEstudioRepository();

// Especificación OpenAPI 3.0 para la API de Estudio Hipotecario
const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "Estudio Hipotecario API",
    version: "1.0.0",
    description: "API de simulación de viabilidad, cálculo de amortización francesa y scoring crediticio (Clean Architecture).",
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: "Servidor local de desarrollo",
    },
  ],
  paths: {
    "/health": {
      get: {
        summary: "Comprobar estado del servicio",
        responses: {
          "200": {
            description: "Servicio operativo",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "estudio-hipotecario-backend" },
                    bd: { type: "string", example: "conectada" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/simular": {
      post: {
        summary: "Simular viabilidad y amortización de estudio hipotecario",
        description: "Ejecuta el análisis de scoring (LTV, DTI), desglose de gastos e impuestos por CC.AA. y cuadro de amortización francés.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["precioInmueble", "tipoVivienda", "finalidad", "comunidadAutonoma", "ahorrosAportados", "titularPrincipal", "condicion"],
                properties: {
                  precioInmueble: { type: "number", example: 250000 },
                  valorTasacion: { type: "number", example: 260000 },
                  tipoVivienda: { type: "string", enum: ["segunda_mano", "obra_nueva"], example: "segunda_mano" },
                  finalidad: { type: "string", enum: ["primera_vivienda", "segunda_residencia", "inversion"], example: "primera_vivienda" },
                  comunidadAutonoma: { type: "string", example: "MD" },
                  ahorrosAportados: { type: "number", example: 65000 },
                  titularPrincipal: {
                    type: "object",
                    required: ["nombre", "contrato", "ingresosNetosMensuales", "deudasMensualesVigentes"],
                    properties: {
                      nombre: { type: "string", example: "Carlos Gómez" },
                      contrato: { type: "string", enum: ["indefinido", "funcionario", "autonomo", "temporal", "pensionista"], example: "indefinido" },
                      ingresosNetosMensuales: { type: "number", example: 3200 },
                      deudasMensualesVigentes: { type: "number", example: 0 },
                    },
                  },
                  cotitular: {
                    type: "object",
                    properties: {
                      nombre: { type: "string", example: "Laura Díaz" },
                      contrato: { type: "string", example: "indefinido" },
                      ingresosNetosMensuales: { type: "number", example: 1800 },
                      deudasMensualesVigentes: { type: "number", example: 0 },
                    },
                  },
                  condicion: {
                    type: "object",
                    required: ["modalidad", "plazoAnios", "tinAnual"],
                    properties: {
                      modalidad: { type: "string", enum: ["fijo", "variable", "mixto"], example: "fijo" },
                      plazoAnios: { type: "number", example: 25 },
                      tinAnual: { type: "number", example: 2.85 },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Dictamen de viabilidad y cuadro de amortización generado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    solicitudId: { type: "string", example: "SOL-1792328123" },
                    dictamen: {
                      type: "object",
                      properties: {
                        semaforo: { type: "string", example: "favorable" },
                        cuotaMensual: { type: "number", example: 878.50 },
                        cuotaMensualFormateada: { type: "string", example: "878,50 €" },
                        capitalPrestado: { type: "number", example: 185000 },
                        ratioLtv: { type: "number", example: 74.0 },
                        ratioDti: { type: "number", example: 27.5 },
                        totalGastosCompraventa: { type: "number", example: 16655 },
                        totalFondosPropiosRequeridos: { type: "number", example: 66655 },
                        deficitAhorro: { type: "number", example: 1655 },
                        alertas: { type: "array", items: { type: "string" } },
                        recomendaciones: { type: "array", items: { type: "string" } },
                      },
                    },
                    amortizacion: {
                      type: "object",
                      properties: {
                        totalIntereses: { type: "number", example: 78550 },
                        totalCosteFinanciacion: { type: "number", example: 263550 },
                        primerasCuotas: { type: "array", items: { type: "object" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Parámetros de solicitud incorrectos",
          },
        },
      },
    },
    "/api/v1/estudios": {
      get: {
        summary: "Listar estudios hipotecarios persistidos",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          "200": { description: "Lista paginada de estudios" },
          "503": { description: "Base de datos no disponible" },
        },
      },
    },
    "/api/v1/estudios/{id}": {
      get: {
        summary: "Obtener detalle de un estudio hipotecario por ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Detalle del estudio" },
          "404": { description: "Estudio no encontrado" },
          "503": { description: "Base de datos no disponible" },
        },
      },
    },
  },
};

function renderSwaggerUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Swagger UI - Estudio Hipotecario API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/favicon-32x32.png" sizes="32x32" />
  <style>
    body { margin: 0; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .topbar { display: none !important; }
    .swagger-ui .info { margin: 30px 0 20px; }
    .swagger-ui .info .title { font-size: 28px; color: #0f172a; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
}

function parseQueryParams(url: string): Record<string, string> {
  const qIndex = url.indexOf("?");
  if (qIndex === -1) return {};
  const params: Record<string, string> = {};
  const query = url.slice(qIndex + 1);
  for (const part of query.split("&")) {
    const [k, v] = part.split("=");
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return params;
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url?.split("?")[0] ?? "/";

  // Redirección raíz a Swagger
  if (req.method === "GET" && (urlPath === "/" || urlPath === "")) {
    res.writeHead(302, { Location: "/docs" });
    res.end();
    return;
  }

  // Swagger UI
  if (req.method === "GET" && (urlPath === "/docs" || urlPath === "/swagger")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderSwaggerUiHtml());
    return;
  }

  // OpenAPI Spec JSON
  if (req.method === "GET" && urlPath === "/openapi.json") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(OPENAPI_SPEC, null, 2));
    return;
  }

  // Healthcheck
  if (req.method === "GET" && urlPath === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      service: "estudio-hipotecario-backend",
      bd: bdDisponible ? "conectada" : "no disponible"
    }));
    return;
  }

  // POST /api/v1/simular
  if (req.method === "POST" && urlPath === "/api/v1/simular") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      (async () => {
        try {
          const input: SimularEstudioInputDto = JSON.parse(body);
          const repo = bdDisponible ? estudioRepository : undefined;
          const useCase = new SimularEstudioHipotecarioUseCase(repo);
          const result = await useCase.execute(input);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result, null, 2));
        } catch (err: unknown) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: (err as Error).message || "Solicitud de simulación inválida" }));
        }
      })();
    });
    return;
  }

  // GET /api/v1/estudios
  if (req.method === "GET" && urlPath === "/api/v1/estudios") {
    (async () => {
      if (!bdDisponible) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Base de datos no disponible" }));
        return;
      }
      try {
        const params = parseQueryParams(req.url ?? "");
        const limite = parseInt(params["limit"] ?? "20", 10);
        const offset = parseInt(params["offset"] ?? "0", 10);
        const [estudios, total] = await Promise.all([
          estudioRepository.listar(limite, offset),
          estudioRepository.contar(),
        ]);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ total, limite, offset, estudios }, null, 2));
      } catch (err: unknown) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: (err as Error).message }));
      }
    })();
    return;
  }

  // GET /api/v1/estudios/:id
  const estudioIdMatch = urlPath.match(/^\/api\/v1\/estudios\/([^/]+)$/);
  if (req.method === "GET" && estudioIdMatch) {
    (async () => {
      if (!bdDisponible) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Base de datos no disponible" }));
        return;
      }
      try {
        const id = estudioIdMatch[1]!;
        const estudio = await estudioRepository.buscarPorId(id);
        if (!estudio) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Estudio no encontrado" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(estudio, null, 2));
      } catch (err: unknown) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: (err as Error).message }));
      }
    })();
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Ruta no encontrada" }));
});

server.listen(PORT, () => {
  console.log(`\n=========================================================`);
  console.log(`🚀 [Backend Estudio Hipotecario] Servidor Activo`);
  console.log(`📖 [Swagger UI Interactivo]: http://localhost:${PORT}/docs`);
  console.log(`📋 [OpenAPI JSON Spec]:     http://localhost:${PORT}/openapi.json`);
  console.log(`🎯 [Endpoint Simulación]:   POST http://localhost:${PORT}/api/v1/simular`);
  console.log(`📚 [Estudios]:              GET  http://localhost:${PORT}/api/v1/estudios`);
  console.log(`=========================================================\n`);
});

// Cierre graceful
async function shutdown(signal: string): Promise<void> {
  console.log(`\n[${signal}] Cerrando servidor...`);
  await prisma.$disconnect();
  server.close(() => {
    console.log("Servidor cerrado. Hasta pronto.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => { shutdown("SIGTERM").catch(console.error); });
process.on("SIGINT",  () => { shutdown("SIGINT").catch(console.error); });
