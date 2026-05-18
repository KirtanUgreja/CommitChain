"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortenAddress(address: `0x${string}`) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectButton() {
  const [hasMounted, setHasMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const injectedConnector = connectors.find(
    (connector) => connector.type === "injected",
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <button
        type="button"
        disabled
        className="rounded-md bg-[#22c55e] px-4 py-2 text-sm font-semibold text-black opacity-60"
      >
        Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        className="rounded-md border border-[#22c55e]/40 px-4 py-2 text-sm font-medium text-[#22c55e] transition hover:border-[#22c55e] hover:bg-[#22c55e]/10"
      >
        {shortenAddress(address)}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!injectedConnector || isPending}
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      className="rounded-md bg-[#22c55e] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
