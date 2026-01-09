/**
 * Wrapper for the `fast_qr` package.
 *
 * @remarks
 *
 * `fast_qr` internally loads a WebAssembly module file with the
 * `new URL(..., import.meta.url)` syntax.
 * This syntax is specially treated by Vite but won't work for files under the
 * `node_modules` folder.
 *
 * To work around this problem, I decided to copy the wasm file,
 * `fast_qr_bg.wasm`, into this folder and load it from here.
 * The wasm file is supposed to be copied by the `postinstall` script in
 * `package.json`.
 *
 * @packageDocumentation
 *
 * @beta
 */

import init from 'fast_qr'
export { SvgOptions, qr_svg as qrSvg } from 'fast_qr'

/**
 * Initializes `fast_qr`.
 *
 * @remarks
 *
 * Explicitly specifies the path to the wasm file so that `fast_qr` does not
 * need to resolve the wasm file by itself.
 *
 * @beta
 */
export const initFastQr = async () => {
  return init({
    module_or_path: new URL('./fast_qr_bg.wasm', import.meta.url)
  })
}
