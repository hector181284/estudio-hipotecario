export interface PoliticaRiesgoDto {
  ltvMaximo: number;
  dtiMaximo: number;
  ltvAlerta: number;
  dtiAlerta: number;
  plazoMaxAnios: number;
  ahorrosMinPct: number;
}

export interface IPoliticaRiesgoRepository {
  obtener(): Promise<PoliticaRiesgoDto>;
  actualizar(dto: PoliticaRiesgoDto): Promise<void>;
}
