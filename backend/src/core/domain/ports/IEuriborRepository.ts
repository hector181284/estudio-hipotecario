export interface EuriborEntrada {
  fecha: string; // 'YYYY-MM'
  valor: number;
}

export interface IEuriborRepository {
  listar(): Promise<EuriborEntrada[]>;
  upsert(entrada: EuriborEntrada): Promise<void>;
  obtenerUltimo(): Promise<EuriborEntrada | null>;
}
