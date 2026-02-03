import type { Hex } from 'viem';
import { toBase58, toEvmHex } from './utils';

export class Address {
  public base58: string;
  public hex: Hex;

  constructor(address: string | Hex, tronWeb: { address: { toHex: (a: string) => string; fromHex: (a: string) => string } }) {
    if (Address.isHex(address)) {
      const raw = address.startsWith('0x') ? address.slice(2) : address;
      const body = raw.slice(-40);
      this.hex = ('0x' + body) as Hex;
      this.base58 = toBase58(this.hex, tronWeb);
    } else {
      this.base58 = address;
      this.hex = toEvmHex(this.base58, tronWeb);
    }
  }

  public Equal(address: Address): boolean {
    return this.base58 === address.base58;
  }

  public static isHex(address: string | Hex): address is Hex {
    return typeof address === 'string' && address.startsWith('0x');
  }
}
