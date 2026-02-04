/**
 * Tron wallet providers: detect, request accounts, get tronWeb.
 * Supported: TronLink, TokenPocket, OKX, Bitget, Ledger (via TronLink).
 */

declare global {
  interface Window {
    tronLink?: {
      ready?: boolean;
      tronWeb?: unknown;
      request: (args: { method: string }) => Promise<unknown>;
    };
    tokenpocket?: {
      tron?: { request: (args: { method: string }) => Promise<unknown> };
      tronWeb?: unknown;
    };
    TokenPocket?: {
      tron?: { request: (args: { method: string }) => Promise<unknown> };
      tronWeb?: unknown;
    };
    okxwallet?: {
      tronLink?: {
        request: (args: { method: string }) => Promise<unknown>;
        tronWeb?: unknown;
      };
    };
    bitkeep?: {
      tronLink?: {
        request: (args: { method: string }) => Promise<unknown>;
        tronWeb?: unknown;
      };
      tronWeb?: unknown;
    };
    bitget?: {
      tronLink?: {
        request: (args: { method: string }) => Promise<unknown>;
        tronWeb?: unknown;
      };
      tronWeb?: unknown;
    };
  }
}

export interface TronWalletProvider {
  id: string;
  name: string;
  icon: string;
  detect: () => boolean;
  request: () => Promise<void>;
  getTronWeb: () => any;
}

// TokenPocket: may inject as window.tokenpocket or window.TokenPocket (TIP-1102: .tron.request, .tronWeb)
function getTokenPocket():
  | Window['tokenpocket']
  | Window['TokenPocket']
  | null {
  if (typeof window === 'undefined') return null;
  const tp = window.tokenpocket ?? (window as any).TokenPocket;
  return tp && (tp.tron || tp.tronWeb) ? tp : null;
}

// Bitget (formerly BitKeep): may inject as window.bitkeep or window.bitget
function getBitget(): Window['bitkeep'] | Window['bitget'] | null {
  if (typeof window === 'undefined') return null;
  const bk = window.bitkeep ?? (window as any).bitget;
  return bk && (bk.tronLink || bk.tronWeb) ? bk : null;
}

const WALLETS: TronWalletProvider[] = [
  {
    id: 'tronlink',
    name: 'TronLink',
    icon: 'T',
    detect: () => !!(typeof window !== 'undefined' && window.tronLink),
    request: async () => {
      if (!window.tronLink) throw new Error('TronLink not found');
      await window.tronLink.request({ method: 'tron_requestAccounts' });
    },
    getTronWeb: () => window.tronLink?.tronWeb ?? null,
  },
  {
    id: 'tokenpocket',
    name: 'TokenPocket',
    icon: 'TP',
    detect: () => !!getTokenPocket(),
    request: async () => {
      const tp = getTokenPocket();
      if (!tp) throw new Error('TokenPocket Tron not found');
      const tron = tp.tron;
      if (!tron?.request) throw new Error('TokenPocket Tron not ready');
      await tron.request({ method: 'eth_requestAccounts' });
    },
    getTronWeb: () => getTokenPocket()?.tronWeb ?? null,
  },
  {
    id: 'okx',
    name: 'OKX',
    icon: 'OKX',
    detect: () =>
      !!(typeof window !== 'undefined' && window.okxwallet?.tronLink),
    request: async () => {
      const ok = window.okxwallet?.tronLink;
      if (!ok) throw new Error('OKX Tron not found');
      await ok.request({ method: 'tron_requestAccounts' });
    },
    getTronWeb: () => window.okxwallet?.tronLink?.tronWeb ?? null,
  },
  {
    id: 'bitget',
    name: 'Bitget Wallet',
    icon: 'BG',
    detect: () => !!getBitget(),
    request: async () => {
      const bk = getBitget();
      if (!bk) throw new Error('Bitget Tron not found');
      const tronLink = bk.tronLink ?? bk;
      if (!(tronLink as any)?.request) throw new Error('Bitget Tron not ready');
      await (tronLink as any).request({ method: 'tron_requestAccounts' });
    },
    getTronWeb: () => {
      const bk = getBitget();
      return bk?.tronWeb ?? (bk?.tronLink as any)?.tronWeb ?? null;
    },
  },
  {
    id: 'ledger',
    name: 'Ledger',
    icon: 'L',
    detect: () => false,
    request: async () => {
      throw new Error('Connect Ledger via TronLink first, then select TronLink above.');
    },
    getTronWeb: () => null,
  },
];

export function getDetectedWallets(): TronWalletProvider[] {
  if (typeof window === 'undefined') return [];
  return WALLETS.filter((w) => w.detect());
}

/** All supported wallets for the modal; show all, connect only when detected. */
export function getAllWallets(): TronWalletProvider[] {
  return WALLETS;
}
