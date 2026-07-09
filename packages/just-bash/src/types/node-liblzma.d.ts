declare module "node-liblzma" {
  export function unxzSync(input: Uint8Array): Uint8Array;
  export function xzSync(input: Uint8Array): Uint8Array;
}
