export interface TablaTributosDto {
  codigoCcaa: string;
  nombre: string;
  itpPct: number;
  ajdPct: number;
}

export interface ITablaTributosRepository {
  listar(): Promise<TablaTributosDto[]>;
  actualizar(tributo: TablaTributosDto): Promise<void>;
}
