declare namespace __AdaptedExports {
  /** Exported memory */
  export const memory: WebAssembly.Memory;
  /**
   * wasm/motor/holt
   * @param serie `~lib/typedarray/Float64Array`
   * @param horizonte `i32`
   * @returns `~lib/typedarray/Float64Array`
   */
  export function holt(serie: Float64Array, horizonte: number): Float64Array;
  /**
   * wasm/motor/zRobusto
   * @param valores `~lib/typedarray/Float64Array`
   * @param grupos `~lib/typedarray/Int32Array`
   * @param nGrupos `i32`
   * @returns `~lib/typedarray/Float64Array`
   */
  export function zRobusto(valores: Float64Array, grupos: Int32Array, nGrupos: number): Float64Array;
  /**
   * wasm/motor/resumo
   * @param v `~lib/typedarray/Float64Array`
   * @returns `~lib/typedarray/Float64Array`
   */
  export function resumo(v: Float64Array): Float64Array;
  /**
   * wasm/motor/nbTreinar
   * @param tokens `~lib/typedarray/Int32Array`
   * @param inicioDoc `~lib/typedarray/Int32Array`
   * @param rotulos `~lib/typedarray/Int32Array`
   * @param nClasses `i32`
   * @param nBuckets `i32`
   */
  export function nbTreinar(tokens: Int32Array, inicioDoc: Int32Array, rotulos: Int32Array, nClasses: number, nBuckets: number): void;
  /**
   * wasm/motor/nbPrever
   * @param tokens `~lib/typedarray/Int32Array`
   * @returns `~lib/typedarray/Float64Array`
   */
  export function nbPrever(tokens: Int32Array): Float64Array;
}
/** Instantiates the compiled WebAssembly module with the given imports. */
export declare function instantiate(module: WebAssembly.Module, imports: {
  env: unknown,
}): Promise<typeof __AdaptedExports>;
