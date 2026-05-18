import { formatEther } from "viem";

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEth(value: bigint): string {
  const formatted = formatEther(value);
  return Number(formatted).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}
