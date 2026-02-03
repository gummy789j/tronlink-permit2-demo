# Permit2 Demo (TronLink)

A standalone browser demo for Permit2 signing and sending on TRON using TronLink (including Ledger).

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Then open the URL (e.g. http://localhost:5173) in a browser with TronLink installed.

## Usage

1. Select **Network** (Testnet / Mainnet) and enter **Permit2 contract address**.
2. Click **Connect Wallet** to connect TronLink (or TronLink + Ledger).
3. Fill **Owner**, **Token**, **Amount**, **Expiration**, **Spender**, **Sig deadline** (Owner is filled after connect).
4. Click **Sign Permit** to sign off-chain; the signed payload is shown below.
5. Click **Send Permit** to submit the permit transaction; the transaction hash is shown.

## Build

```bash
npm run build
```

Output is in `dist/`.
