import type { Hex } from 'viem';

type TronWebLike = { address: { toHex: (a: string) => string; fromHex: (a: string) => string } };

export function toEvmHex(addr: string, tronWeb: TronWebLike): Hex {
  const hex = tronWeb.address.toHex(addr);
  const body = (hex.startsWith('41') ? hex.slice(2) : hex.replace(/^0x/, '')).slice(-40);
  return ('0x' + body) as Hex;
}

export function toBase58(addr: string, tronWeb: TronWebLike): string {
  return tronWeb.address.fromHex(addr);
}
