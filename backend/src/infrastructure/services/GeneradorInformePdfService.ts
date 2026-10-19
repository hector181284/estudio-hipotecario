import PDFDocument from "pdfkit";
import type { SimularEstudioOutputDto, SimularEstudioInputDto } from "../../core/application/use-cases/SimularEstudioHipotecarioUseCase.js";

export interface DatosInformePdf {
  solicitudId: string;
  fechaEmision: string;
  lead?: {
    nombre?: string;
    email?: string;
    telefono?: string;
  };
  input: SimularEstudioInputDto;
  output: SimularEstudioOutputDto;
}

export class GeneradorInformePdfService {
  public static async generarBuffer(datos: DatosInformePdf): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Informe Viabilidad Hipotecaria - ${datos.solicitudId}`,
          Author: "Estudio Hipotecario Fintech Platform",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const { input, output } = datos;
      const { dictamen, amortizacion } = output;

      // --- Cabecera / Banner ---
      doc.rect(40, 40, 515, 60).fill("#1e293b"); // Slate 800
      doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold")
        .text("INFORME DE VIABILIDAD HIPOTECARIA", 55, 52);
      doc.fontSize(10).font("Helvetica")
        .text(`Referencia: ${datos.solicitudId}  |  Emisión: ${datos.fechaEmision}`, 55, 78);

      let y = 115;

      // --- Datos del Solicitante / Lead ---
      doc.fillColor("#0f172a").fontSize(13).font("Helvetica-Bold")
        .text("1. Resumen de la Operación y Participantes", 40, y);
      y += 20;

      doc.rect(40, y, 515, 65).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#334155").fontSize(9).font("Helvetica");

      const titularNombre = datos.lead?.nombre || input.titularPrincipal.nombre;
      const titularEmail = datos.lead?.email ? ` (${datos.lead.email})` : "";
      
      doc.text(`Titular Principal: ${titularNombre}${titularEmail}`, 52, y + 10);
      doc.text(`Situación Laboral: Contrato ${input.titularPrincipal.contrato}  |  Ingresos: ${input.titularPrincipal.ingresosNetosMensuales.toLocaleString("es-ES")} €/mes`, 52, y + 24);
      doc.text(`Precio Inmueble: ${input.precioInmueble.toLocaleString("es-ES")} €  |  Comunidad: ${input.comunidadAutonoma}  |  Tipo: ${input.tipoVivienda}`, 52, y + 38);
      doc.text(`Ahorros aportados: ${input.ahorrosAportados.toLocaleString("es-ES")} €  |  Finalidad: ${input.finalidad.replace("_", " ")}`, 52, y + 52);

      y += 80;

      // --- Semáforo y Dictamen de Viabilidad ---
      doc.fillColor("#0f172a").fontSize(13).font("Helvetica-Bold")
        .text("2. Dictamen de Scoring y Ratios Financieros", 40, y);
      y += 20;

      // Color del semáforo
      let semaforoBg = "#ecfdf5"; // emerald-50
      let semaforoBorder = "#10b981"; // emerald-500
      let semaforoTexto = "FAVORABLE (Operación Viable)";
      let semaforoColorTexto = "#065f46";

      if (dictamen.semaforo === "condicionado") {
        semaforoBg = "#fffbeb";
        semaforoBorder = "#f59e0b";
        semaforoTexto = "CONDICIONADO (Requiere revisión de garantías o ahorro)";
        semaforoColorTexto = "#92400e";
      } else if (dictamen.semaforo === "riesgo_elevado") {
        semaforoBg = "#fef2f2";
        semaforoBorder = "#ef4444";
        semaforoTexto = "RIESGO ELEVADO (Supera límites prudenciales bancarios)";
        semaforoColorTexto = "#991b1b";
      }

      doc.rect(40, y, 515, 32).fillAndStroke(semaforoBg, semaforoBorder);
      doc.fillColor(semaforoColorTexto).fontSize(11).font("Helvetica-Bold")
        .text(`RESULTADO SCORING: ${semaforoTexto}`, 52, y + 10);

      y += 42;

      // Tarjetas de Métricas (Cuota, Préstamo, LTV, DTI)
      const anchoCard = 120;
      const altoCard = 50;

      // Card 1: Cuota Mensual
      doc.rect(40, y, anchoCard, altoCard).fillAndStroke("#ffffff", "#cbd5e1");
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text("CUOTA MENSUAL", 48, y + 8);
      doc.fillColor("#0f172a").fontSize(14).font("Helvetica-Bold").text(`${dictamen.cuotaMensualFormateada}`, 48, y + 24);

      // Card 2: Capital Prestado
      doc.rect(170, y, anchoCard, altoCard).fillAndStroke("#ffffff", "#cbd5e1");
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text("CAPITAL PRÉSTAMO", 178, y + 8);
      doc.fillColor("#0f172a").fontSize(14).font("Helvetica-Bold").text(`${dictamen.capitalPrestadoFormateado}`, 178, y + 24);

      // Card 3: Ratio LTV
      doc.rect(300, y, anchoCard, altoCard).fillAndStroke("#ffffff", "#cbd5e1");
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text("RATIO LTV (Máx 80%)", 308, y + 8);
      const ltvColor = dictamen.ratioLtv > 80 ? "#dc2626" : "#16a34a";
      doc.fillColor(ltvColor).fontSize(14).font("Helvetica-Bold").text(`${dictamen.ratioLtv.toFixed(1)}%`, 308, y + 24);

      // Card 4: Ratio DTI
      doc.rect(435, y, 120, altoCard).fillAndStroke("#ffffff", "#cbd5e1");
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text("ENDEUDAMIENTO (DTI)", 443, y + 8);
      const dtiColor = dictamen.ratioDti > 35 ? "#dc2626" : "#16a34a";
      doc.fillColor(dtiColor).fontSize(14).font("Helvetica-Bold").text(`${dictamen.ratioDti.toFixed(1)}%`, 443, y + 24);

      y += 65;

      // Alertas y Recomendaciones
      if (dictamen.alertas.length > 0) {
        doc.fillColor("#b45309").fontSize(9).font("Helvetica-Bold").text("Alertas identificadas:", 40, y);
        y += 12;
        doc.font("Helvetica").fontSize(8);
        dictamen.alertas.forEach((alerta) => {
          doc.text(`• ${alerta}`, 50, y);
          y += 11;
        });
        y += 6;
      }

      if (dictamen.recomendaciones.length > 0) {
        doc.fillColor("#1d4ed8").fontSize(9).font("Helvetica-Bold").text("Recomendaciones de optimización:", 40, y);
        y += 12;
        doc.font("Helvetica").fontSize(8);
        dictamen.recomendaciones.forEach((rec) => {
          doc.text(`• ${rec}`, 50, y);
          y += 11;
        });
        y += 6;
      }

      y += 10;

      // --- Desglose Financiero y Gastos ---
      doc.fillColor("#0f172a").fontSize(13).font("Helvetica-Bold")
        .text("3. Desglose de Gastos e Inversión Total", 40, y);
      y += 18;

      doc.rect(40, y, 515, 80).fillAndStroke("#f1f5f9", "#cbd5e1");
      doc.fillColor("#1e293b").fontSize(8.5).font("Helvetica");

      const tablaGastos = [
        ["Total Gastos Compraventa (ITP/AJD + Notaría + Registro + Tasación)", `${dictamen.totalGastosCompraventa.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`],
        ["Total Fondos Propios Requeridos (Entrada + Gastos)", `${dictamen.totalFondosPropiosRequeridos.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`],
        ["Ahorros Disponibles Aportados", `${input.ahorrosAportados.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`],
        ["Déficit / Superávit de Ahorro", `${dictamen.deficitAhorro > 0 ? `Déficit: -${dictamen.deficitAhorro.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €` : "Ahorro suficiente cubierto"}`],
      ];

      let rowY = y + 8;
      tablaGastos.forEach(([concepto, importe]) => {
        doc.font("Helvetica").text(concepto, 52, rowY);
        doc.font("Helvetica-Bold").text(importe, 380, rowY, { width: 160, align: "right" });
        rowY += 16;
      });

      y += 100;

      // --- Cuadro de Amortización Francés (Extracto primeros 12 meses) ---
      doc.fillColor("#0f172a").fontSize(13).font("Helvetica-Bold")
        .text("4. Cuadro de Amortización Francés (Primeros 12 meses)", 40, y);
      y += 18;

      // Encabezados de tabla
      doc.rect(40, y, 515, 18).fill("#334155");
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
      doc.text("Mes", 48, y + 5);
      doc.text("Cuota Total", 110, y + 5, { width: 75, align: "right" });
      doc.text("Amort. Capital", 205, y + 5, { width: 75, align: "right" });
      doc.text("Intereses", 300, y + 5, { width: 75, align: "right" });
      doc.text("Capital Pendiente", 420, y + 5, { width: 115, align: "right" });
      y += 18;

      // Filas de amortización
      amortizacion.primerasCuotas.forEach((cuota, idx) => {
        const bgFila = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(40, y, 515, 14).fill(bgFila);

        doc.fillColor("#334155").fontSize(7.5).font("Helvetica");
        doc.text(`Mes ${cuota.mes}`, 48, y + 3);
        doc.text(`${cuota.cuota.toFixed(2)} €`, 110, y + 3, { width: 75, align: "right" });
        doc.text(`${cuota.capital.toFixed(2)} €`, 205, y + 3, { width: 75, align: "right" });
        doc.text(`${cuota.interes.toFixed(2)} €`, 300, y + 3, { width: 75, align: "right" });
        doc.text(`${cuota.pendiente.toFixed(2)} €`, 420, y + 3, { width: 115, align: "right" });
        y += 14;
      });

      // Pie de página con aviso legal
      y = 770;
      doc.fillColor("#94a3b8").fontSize(7).font("Helvetica")
        .text(
          "Nota Legal: Este documento es una simulación orientativa de viabilidad y amortización financiera no vinculante contractualmente. Las condiciones definitivas están sujetas a la aprobación de la entidad financiera y la tasación oficial de la garantía hipotecaria.",
          40,
          y,
          { width: 515, align: "justify" }
        );

      doc.end();
    });
  }
}
