import type { SimularEstudioInputDto, SimularEstudioOutputDto } from "../../../core/application/use-cases/SimularEstudioHipotecarioUseCase.js";

export interface EstudioResumen {
  id: string;
  creadoEn: Date;
  semaforo: string | null;
  cuotaMensual: number | null;
  capitalPrestado: number | null;
  comunidadAutonoma: string;
  plazoAnios: number;
  tipoVivienda: string;
}

export interface EstudioCompletoPersistido {
  input: SimularEstudioInputDto;
  output: SimularEstudioOutputDto;
}

export interface IEstudioRepository {
  guardar(input: SimularEstudioInputDto, output: SimularEstudioOutputDto): Promise<string>;
  buscarPorId(id: string): Promise<SimularEstudioOutputDto | null>;
  buscarCompletoPorId(id: string): Promise<EstudioCompletoPersistido | null>;
  listar(limite?: number, offset?: number): Promise<EstudioResumen[]>;
  contar(): Promise<number>;
}
