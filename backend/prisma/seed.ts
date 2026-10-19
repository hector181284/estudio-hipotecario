import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.politicaRiesgo.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      ltvMaximo: 0.80,
      dtiMaximo: 0.35,
      ltvAlerta: 0.75,
      dtiAlerta: 0.30,
      plazoMaxAnios: 30,
      ahorrosMinPct: 0.20,
    },
  });

  const tributos = [
    { codigoCcaa: "MD", nombre: "Madrid", itpPct: 0.06, ajdPct: 0.0075 },
    { codigoCcaa: "CT", nombre: "Cataluña", itpPct: 0.10, ajdPct: 0.015 },
    { codigoCcaa: "AN", nombre: "Andalucía", itpPct: 0.07, ajdPct: 0.012 },
    { codigoCcaa: "VC", nombre: "C. Valenciana", itpPct: 0.10, ajdPct: 0.015 },
    { codigoCcaa: "PV", nombre: "País Vasco", itpPct: 0.04, ajdPct: 0.005 },
    { codigoCcaa: "GA", nombre: "Galicia", itpPct: 0.08, ajdPct: 0.010 },
    { codigoCcaa: "CL", nombre: "Castilla y León", itpPct: 0.08, ajdPct: 0.010 },
    { codigoCcaa: "CM", nombre: "Castilla-La Mancha", itpPct: 0.09, ajdPct: 0.010 },
    { codigoCcaa: "IB", nombre: "Baleares", itpPct: 0.08, ajdPct: 0.012 },
    { codigoCcaa: "CN", nombre: "Canarias", itpPct: 0.065, ajdPct: 0.0075 },
  ];

  for (const t of tributos) {
    await prisma.tablaTributosCcaa.upsert({
      where: { codigoCcaa: t.codigoCcaa },
      update: { itpPct: t.itpPct, ajdPct: t.ajdPct },
      create: t,
    });
  }

  const euribor = [
    { fecha: "2024-01", valor: 3.609 },
    { fecha: "2024-06", valor: 3.650 },
    { fecha: "2024-12", valor: 2.431 },
    { fecha: "2025-06", valor: 2.103 },
    { fecha: "2025-12", valor: 2.048 },
  ];

  for (const e of euribor) {
    const [year, month] = e.fecha.split("-").map(Number);
    const fechaDate = new Date(year, month - 1, 1);
    await prisma.registroEuribor.upsert({
      where: { fecha: fechaDate },
      update: { valor: e.valor },
      create: { fecha: fechaDate, valor: e.valor },
    });
  }

  console.log("✅ Seed completado.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
