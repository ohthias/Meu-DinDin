export async function instantiate(module, imports = {}) {
  const adaptedImports = {
    env: Object.setPrototypeOf({
      abort(message, fileName, lineNumber, columnNumber) {
        // ~lib/builtins/abort(~lib/string/String | null?, ~lib/string/String | null?, u32?, u32?) => void
        message = __liftString(message >>> 0);
        fileName = __liftString(fileName >>> 0);
        lineNumber = lineNumber >>> 0;
        columnNumber = columnNumber >>> 0;
        (() => {
          // @external.js
          throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
        })();
      },
    }, Object.assign(Object.create(globalThis), imports.env || {})),
  };
  const { exports } = await WebAssembly.instantiate(module, adaptedImports);
  const memory = exports.memory || imports.env.memory;
  const adaptedExports = Object.setPrototypeOf({
    holt(serie, horizonte) {
      // wasm/motor/holt(~lib/typedarray/Float64Array, i32) => ~lib/typedarray/Float64Array
      serie = __lowerTypedArray(Float64Array, 4, 3, serie) || __notnull();
      return __liftTypedArray(Float64Array, exports.holt(serie, horizonte) >>> 0);
    },
    zRobusto(valores, grupos, nGrupos) {
      // wasm/motor/zRobusto(~lib/typedarray/Float64Array, ~lib/typedarray/Int32Array, i32) => ~lib/typedarray/Float64Array
      valores = __retain(__lowerTypedArray(Float64Array, 4, 3, valores) || __notnull());
      grupos = __lowerTypedArray(Int32Array, 5, 2, grupos) || __notnull();
      try {
        return __liftTypedArray(Float64Array, exports.zRobusto(valores, grupos, nGrupos) >>> 0);
      } finally {
        __release(valores);
      }
    },
    resumo(v) {
      // wasm/motor/resumo(~lib/typedarray/Float64Array) => ~lib/typedarray/Float64Array
      v = __lowerTypedArray(Float64Array, 4, 3, v) || __notnull();
      return __liftTypedArray(Float64Array, exports.resumo(v) >>> 0);
    },
    nbTreinar(tokens, inicioDoc, rotulos, nClasses, nBuckets) {
      // wasm/motor/nbTreinar(~lib/typedarray/Int32Array, ~lib/typedarray/Int32Array, ~lib/typedarray/Int32Array, i32, i32) => void
      tokens = __retain(__lowerTypedArray(Int32Array, 5, 2, tokens) || __notnull());
      inicioDoc = __retain(__lowerTypedArray(Int32Array, 5, 2, inicioDoc) || __notnull());
      rotulos = __lowerTypedArray(Int32Array, 5, 2, rotulos) || __notnull();
      try {
        exports.nbTreinar(tokens, inicioDoc, rotulos, nClasses, nBuckets);
      } finally {
        __release(tokens);
        __release(inicioDoc);
      }
    },
    nbPrever(tokens) {
      // wasm/motor/nbPrever(~lib/typedarray/Int32Array) => ~lib/typedarray/Float64Array
      tokens = __lowerTypedArray(Int32Array, 5, 2, tokens) || __notnull();
      return __liftTypedArray(Float64Array, exports.nbPrever(tokens) >>> 0);
    },
  }, exports);
  function __liftString(pointer) {
    if (!pointer) return null;
    const
      end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1,
      memoryU16 = new Uint16Array(memory.buffer);
    let
      start = pointer >>> 1,
      string = "";
    while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
    return string + String.fromCharCode(...memoryU16.subarray(start, end));
  }
  function __liftTypedArray(constructor, pointer) {
    if (!pointer) return null;
    return new constructor(
      memory.buffer,
      __getU32(pointer + 4),
      __dataview.getUint32(pointer + 8, true) / constructor.BYTES_PER_ELEMENT
    ).slice();
  }
  function __lowerTypedArray(constructor, id, align, values) {
    if (values == null) return 0;
    const
      length = values.length,
      buffer = exports.__pin(exports.__new(length << align, 1)) >>> 0,
      header = exports.__new(12, id) >>> 0;
    __setU32(header + 0, buffer);
    __dataview.setUint32(header + 4, buffer, true);
    __dataview.setUint32(header + 8, length << align, true);
    new constructor(memory.buffer, buffer, length).set(values);
    exports.__unpin(buffer);
    return header;
  }
  const refcounts = new Map();
  function __retain(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount) refcounts.set(pointer, refcount + 1);
      else refcounts.set(exports.__pin(pointer), 1);
    }
    return pointer;
  }
  function __release(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount === 1) exports.__unpin(pointer), refcounts.delete(pointer);
      else if (refcount) refcounts.set(pointer, refcount - 1);
      else throw Error(`invalid refcount '${refcount}' for reference '${pointer}'`);
    }
  }
  function __notnull() {
    throw TypeError("value must not be null");
  }
  let __dataview = new DataView(memory.buffer);
  function __setU32(pointer, value) {
    try {
      __dataview.setUint32(pointer, value, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      __dataview.setUint32(pointer, value, true);
    }
  }
  function __getU32(pointer) {
    try {
      return __dataview.getUint32(pointer, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      return __dataview.getUint32(pointer, true);
    }
  }
  return adaptedExports;
}
