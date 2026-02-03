import { AllowanceTransfer } from './lib/AllowanceTransfer';
import { Address } from './lib/address';
import type { PermitSingleWithSignature } from './lib/types';

declare global {
  interface Window {
    tronLink?: {
      ready?: boolean;
      tronWeb?: unknown;
      request: (args: { method: string }) => Promise<unknown>;
    };
  }
}

const TESTNET_FULL_HOST = 'https://nile.trongrid.io';
const MAINNET_FULL_HOST = 'https://api.trongrid.io';

const PERMIT2_TESTNET = 'TYQuuhGbEMxF7nZxUHV3uHJxAVVAegNU9h';
const PERMIT2_MAINNET = 'TTJxU3P8rHycAyFY4kVtGNfmnMH4ezcuM9';

const TOKEN_TESTNET = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf';
const TOKEN_MAINNET = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const SPENDER_TESTNET = 'TMTQ1BYo15aGgZXHcsBWXyae8bVaAdgfLP';
const SPENDER_MAINNET = 'TC8xQzPHfn5KceZV6s6GmZkBCFWWUoPXs1';

const TRONSCAN_TESTNET = 'https://nile.tronscan.org/#/transaction';
const TRONSCAN_MAINNET = 'https://api.tronscan.org/#/transaction';

const SECONDS_PER_DAY = 86400;
const SECONDS_PER_HOUR = 3600;

function nowPlus30Days(): string {
  return String(Math.floor(Date.now() / 1000) + 30 * SECONDS_PER_DAY);
}

const statusEl = document.getElementById('status') as HTMLDivElement;
const signedPermitEl = document.getElementById(
  'signedPermit'
) as HTMLPreElement;
const txHashEl = document.getElementById('txHash') as HTMLDivElement;
const networkEl = document.getElementById('network') as HTMLSelectElement;
const permit2AddressEl = document.getElementById(
  'permit2Address'
) as HTMLInputElement;
const ownerEl = document.getElementById('owner') as HTMLInputElement;
const tokenEl = document.getElementById('token') as HTMLInputElement;
const amountEl = document.getElementById('amount') as HTMLInputElement;
const expirationEl = document.getElementById('expiration') as HTMLInputElement;
const spenderEl = document.getElementById('spender') as HTMLInputElement;
const connectBtn = document.getElementById(
  'connectWallet'
) as HTMLButtonElement;
const signBtn = document.getElementById('signPermit') as HTMLButtonElement;
const sendBtn = document.getElementById('sendPermit') as HTMLButtonElement;

let tronWeb: any = null;
let signedPermit: PermitSingleWithSignature | null = null;

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

function setSignedPermit(json: string) {
  signedPermitEl.textContent = json;
}

function setTxHash(msg: string) {
  if (!msg || msg === '—') {
    txHashEl.innerHTML = '';
    txHashEl.append(msg || '—');
    return;
  }
  const base = isTestnet() ? TRONSCAN_TESTNET : TRONSCAN_MAINNET;
  const href = `${base}/${msg}/event-logs`;
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = msg;
  txHashEl.innerHTML = '';
  txHashEl.appendChild(a);
}

function isTestnet(): boolean {
  return networkEl.value === 'testnet';
}

function getPermit2Address(): string {
  return permit2AddressEl.value.trim();
}

function applyNetworkDefaults() {
  const testnet = isTestnet();
  permit2AddressEl.value = testnet ? PERMIT2_TESTNET : PERMIT2_MAINNET;
  tokenEl.value = testnet ? TOKEN_TESTNET : TOKEN_MAINNET;
  spenderEl.value = testnet ? SPENDER_TESTNET : SPENDER_MAINNET;
  expirationEl.value = nowPlus30Days();
}

// Defaults: set Permit2 address and expiration by network
applyNetworkDefaults();
amountEl.value = '1000000';

networkEl.addEventListener('change', applyNetworkDefaults);

// Connect Wallet
async function connectWallet() {
  if (!window.tronLink) {
    setStatus('TronLink not found. Please install TronLink extension.');
    return;
  }
  try {
    setStatus('Connecting...');
    await window.tronLink.request({ method: 'tron_requestAccounts' });
    const tw = window.tronLink.tronWeb;
    if (!tw) {
      setStatus('TronLink not ready. Please unlock and try again.');
      return;
    }
    tronWeb = tw;
    const host = isTestnet() ? TESTNET_FULL_HOST : MAINNET_FULL_HOST;
    if (typeof (tronWeb as any).setFullNode === 'function') {
      (tronWeb as any).setFullNode(host);
    } else if (typeof (tronWeb as any).setFullHost === 'function') {
      (tronWeb as any).setFullHost(host);
    }
    const addr = (tronWeb as any).defaultAddress?.base58;
    if (addr) {
      ownerEl.value = addr;
    }
    setStatus('Connected: ' + (addr || 'unknown'));
  } catch (e) {
    setStatus('Connect failed: ' + String(e));
  }
}

// Sign Permit
async function signPermit() {
  if (!tronWeb) {
    setStatus('Connect wallet first.');
    return;
  }
  const permit2Address = getPermit2Address();
  if (!permit2Address) {
    setStatus('Enter Permit2 contract address.');
    return;
  }
  const owner = ownerEl.value.trim();
  const token = tokenEl.value.trim();
  const spender = spenderEl.value.trim();
  if (!owner || !token || !spender) {
    setStatus('Fill owner, token, and spender.');
    return;
  }
  try {
    setStatus('Signing...');
    const at = new AllowanceTransfer(tronWeb, permit2Address, isTestnet());
    const ownerAddr = new Address(owner, tronWeb);
    const tokenAddr = new Address(token, tronWeb);
    const spenderAddr = new Address(spender, tronWeb);
    const allowanceInfo = await at.allowance(
      ownerAddr.base58,
      tokenAddr.base58,
      spenderAddr.base58
    );
    setStatus(
      `Allowance from chain: amount=${allowanceInfo.amount}, expiration=${allowanceInfo.expiration}, nonce=${allowanceInfo.nonce} — signing...`
    );
    // Use fresh expiration at sign time so allowance is always 30d from now (avoids AllowanceExpired)
    const expiration = nowPlus30Days();
    expirationEl.value = expiration;
    const params = {
      owner,
      token,
      amount: BigInt(amountEl.value || '0'),
      deadline: expiration,
    };
    // Sig deadline 30d so user has time to submit tx (1hr was too short, could hit expired error)
    const sigDeadline = nowPlus30Days();
    const result = await at.generatePermitSignature(
      params,
      spender,
      sigDeadline
    );
    signedPermit = result;
    setSignedPermit(
      JSON.stringify(
        result,
        (_, v) => (typeof v === 'bigint' ? v.toString() : v),
        2
      )
    );
    setStatus('Signed successfully.');
  } catch (e) {
    setStatus('Sign failed: ' + String(e));
    setSignedPermit('—');
    signedPermit = null;
  }
}

// Normalize address to 0x+40 using Address (needs tronWeb)
function toEvmHexSafe(addr: string, tw: unknown): string {
  const a = new Address(
    addr,
    tw as {
      address: { toHex: (a: string) => string; fromHex: (a: string) => string };
    }
  );
  return a.hex;
}

function fixSignatureForPermit2(signature: string): string {
  let sig = signature.startsWith('0x') ? signature.slice(2) : signature;
  if (sig.length !== 130) {
    console.error('Invalid signature length:', sig.length);
    return signature;
  }

  const r = sig.substring(0, 64);
  const s = sig.substring(64, 128);
  let v = parseInt(sig.substring(128, 130), 16);

  console.log('Original v:', v);
  if (v < 27) {
    v = v + 27;
    console.log('Fixed v:', v);
  }

  if (v !== 27 && v !== 28) {
    console.error('Invalid v value after fix:', v);
    v = 27;
  }

  const vHex = v.toString(16).padStart(2, '0');
  const fixedSignature = '0x' + r + s + vHex;
  return fixedSignature;
}

// Send Permit — parameter format from working example: permitSingle = [[token, amount, expiration, nonce], spender, sigDeadline]
async function sendPermit() {
  if (!tronWeb) {
    setStatus('Connect wallet first.');
    return;
  }
  if (!signedPermit) {
    setStatus('Sign permit first.');
    return;
  }
  const permit2Address = getPermit2Address();
  if (!permit2Address) {
    setStatus('Enter Permit2 contract address.');
    return;
  }
  try {
    setStatus('Sending...');
    const ownerHex = toEvmHexSafe(ownerEl.value.trim(), tronWeb);
    const tokenHex = toEvmHexSafe(signedPermit.details.token, tronWeb);
    const spenderHex = toEvmHexSafe(signedPermit.spender, tronWeb);
    // Same format as working example: details as flat [token, amount, expiration, nonce], then spender, then sigDeadline (strings)
    const permitSingle: [string[], string, string] = [
      [
        tokenHex,
        signedPermit.details.amount,
        signedPermit.details.expiration,
        signedPermit.details.nonce,
      ],
      spenderHex,
      signedPermit.sigDeadline,
    ];
    const functionSelector =
      'permit(address,((address,uint160,uint48,uint48),address,uint256),bytes)';
    const parameter = [
      { type: 'address', value: ownerHex },
      {
        type: '((address,uint160,uint48,uint48),address,uint256)',
        value: permitSingle,
      },
      { type: 'bytes', value: fixSignatureForPermit2(signedPermit.signature) },
    ];

    const contractAddr = permit2Address.startsWith('T')
      ? (tronWeb as any).address.toHex(permit2Address)
      : permit2Address;

    const tx = await (tronWeb as any).transactionBuilder.triggerSmartContract(
      contractAddr,
      functionSelector,
      { feeLimit: 100_000_000, callValue: 0 },
      parameter,
      (tronWeb as any).defaultAddress.base58
    );

    if (!tx.result?.result || !tx.transaction) {
      setStatus(
        'Send failed. ' + (tx.result?.message || 'Transaction build failed.')
      );
      return;
    }

    const signedTx = await (tronWeb as any).trx.sign(tx.transaction);
    const result = await (tronWeb as any).trx.sendRawTransaction(signedTx);

    const txId =
      result?.transaction?.txID ?? result?.txid ?? JSON.stringify(result);
    setTxHash(String(txId));
    setStatus('Transaction sent.');
  } catch (e) {
    setStatus('Send failed: ' + String(e));
  }
}

connectBtn.addEventListener('click', connectWallet);
signBtn.addEventListener('click', signPermit);
sendBtn.addEventListener('click', sendPermit);

setStatus('Set network and Permit2 address, then Connect Wallet.');
setSignedPermit('—');
setTxHash('—');
