// Permite ejecutar desde un script módulos que declaran "server-only"
const Module = require("module");
const original = Module._resolveFilename;
const vacio = require.resolve("./_vacio.cjs");
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return vacio;
  return original.call(this, request, ...rest);
};
