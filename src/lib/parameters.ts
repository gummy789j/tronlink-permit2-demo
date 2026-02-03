import type { Hex } from 'viem';

export const getAllowanceParameters = (
  userAddress: Hex,
  tokenAddress: Hex,
  spenderAddress: Hex
) => [
  { type: 'address' as const, value: userAddress },
  { type: 'address' as const, value: tokenAddress },
  { type: 'address' as const, value: spenderAddress },
];
