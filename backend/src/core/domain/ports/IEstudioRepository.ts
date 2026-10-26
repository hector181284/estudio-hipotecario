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
  titularNombre?: string;
  cotitularNombre?: string;
  estadoOperacion?: string;
}

export interface DatosSeguimientoDto {
  estadoOperacion?: string;
  bancoSeleccionado?: string;
  gestorAsignado?: string;
  fechaLimiteArras?: string;
  importeArras?: number;
  tasadora?: string;
  valorTasacionReal?: number;
  notaria?: string;
  fechaFirmaNotaria?: string;
  nuevaNota?: string;
  datosExpedienteJson?: string | null;
}

export interface SeguimientoCompleto {
  estadoOperacion: string;
  bancoSeleccionado?: string | null;
  gestorAsignado?: string | null;
  fechaLimiteArras?: Date | null;
  importeArras?: number | null;
  tasadora?: string | null;
  valorTasacionReal?: number | null;
  notaria?: string | null;
  fechaFirmaNotaria?: Date | null;
  notasSeguimiento: string[];
  datosExpedienteJson?: string | null;
}

export interface FiltrosEstudio {
  search?: string;
  semaforo?: string;
  desde?: Date;
  hasta?: Date;
  estadoOperacion?: string;
}

export interface EstudioCompletoPersistido {
  input: SimularEstudioInputDto;
  output: SimularEstudioOutputDto;
  seguimiento: SeguimientoCompleto;
}

export interface IEstudioRepository {
  guardar(input: SimularEstudioInputDto, output: SimularEstudioOutputDto): Promise<string>;
  buscarPorId(id: string): Promise<SimularEstudioOutputDto | null>;
  buscarCompletoPorId(id: string): Promise<EstudioCompletoPersistido | null>;
  actualizarSeguimiento(id: string, datos: DatosSeguimientoDto): Promise<void>;
  listar(limite?: number, offset?: number, filtros?: FiltrosEstudio): Promise<EstudioResumen[]>;
  contar(filtros?: FiltrosEstudio): Promise<number>;
}
