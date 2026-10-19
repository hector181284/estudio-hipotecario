import http from "node:http";
import { SimularEstudioHipotecarioUseCase, SimularEstudioInputDto } from "../core/application/use-cases/SimularEstudioHipotecarioUseCase.js";
import { prisma } from "../infrastructure/database/prisma-client.js";
import { PrismaEstudioRepository } from "../infrastructure/database/repositories/PrismaEstudioRepository.js";
import { GeneradorInformePdfService } from "../infrastructure/services/GeneradorInformePdfService.js";

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
    version: "1.1.0",
    description: "API de simulación de viabilidad, cálculo de amortización francesa, scoring crediticio y generación de informes PDF.",
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
              },
            },
          },
        },
        responses: {
          "200": { description: "Dictamen de viabilidad generado" },
          "400": { description: "Parámetros incorrectos" },
        },
      },
    },
    "/api/v1/simular/pdf": {
      post: {
        summary: "Generar informe PDF directo a partir de parámetros",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  lead: {
                    type: "object",
                    properties: {
                      nombre: { type: "string" },
                      email: { type: "string" },
                      telefono: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Documento binario PDF generado",
            content: { "application/pdf": {} },
          },
        },
      },
    },
    "/api/v1/estudios": {
      get: {
        summary: "Listar estudios hipotecarios persistidos",
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
        },
      },
    },
    "/api/v1/estudios/{id}/pdf": {
      get: {
        summary: "Descargar informe PDF de un estudio guardado",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Documento binario PDF del estudio",
            content: { "application/pdf": {} },
          },
          "404": { description: "Estudio no encontrado" },
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

  // POST /api/v1/simular/pdf
  if (req.method === "POST" && urlPath === "/api/v1/simular/pdf") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      (async () => {
        try {
          const payload = JSON.parse(body);
          const lead = payload.lead;
          const input: SimularEstudioInputDto = payload;

          const repo = bdDisponible ? estudioRepository : undefined;
          const useCase = new SimularEstudioHipotecarioUseCase(repo);
          const output = await useCase.execute(input);

          const pdfBuffer = await GeneradorInformePdfService.generarBuffer({
            solicitudId: output.solicitudId,
            fechaEmision: new Date().toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            lead,
            input,
            output,
          });

          res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="informe-hipoteca-${output.solicitudId}.pdf"`,
            "Content-Length": pdfBuffer.length,
          });
          res.end(pdfBuffer);
        } catch (err: unknown) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: (err as Error).message || "Error al generar informe PDF" }));
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

  // GET /api/v1/estudios/:id/pdf
  const pdfMatch = urlPath.match(/^\/api\/v1\/estudios\/([^/]+)\/pdf$/);
  if (req.method === "GET" && pdfMatch) {
    (async () => {
      if (!bdDisponible) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Base de datos no disponible" }));
        return;
      }
      try {
        const id = pdfMatch[1]!;
        const estudioCompleto = await estudioRepository.buscarCompletoPorId(id);
        if (!estudioCompleto) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Estudio no encontrado" }));
          return;
        }

        const pdfBuffer = await GeneradorInformePdfService.generarBuffer({
          solicitudId: id,
          fechaEmision: new Date().toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          input: estudioCompleto.input,
          output: estudioCompleto.output,
        });

        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="informe-hipoteca-${id}.pdf"`,
          "Content-Length": pdfBuffer.length,
        });
        res.end(pdfBuffer);
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
  console.log(`📄 [Generación PDF]:        POST http://localhost:${PORT}/api/v1/simular/pdf`);
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
