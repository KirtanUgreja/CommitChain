"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import {
  useCastVote,
  useCommitmentCount,
  useGetCommitment,
  useGetVerifiers,
  useHasVoted,
} from "@/hooks/useCommitmentContract";
import { canVote, getStatusLabel } from "@/lib/commitment";
import { formatEth, shortenAddress } from "@/lib/format";

type CommitmentTuple = readonly [
  `0x${string}`,
  string,
  string,
  bigint,
  bigint,
  `0x${string}`,
  bigint,
  bigint,
  number,
];

function statusClasses(status: number) {
  const label = getStatusLabel(status);

  if (label === "COMPLETED") {
    return "border-blue-400/30 bg-blue-400/10 text-blue-300";
  }

  if (label === "FAILED") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#86efac]";
}

function CommitmentCard({
  id,
  walletAddress,
}: {
  id: bigint;
  walletAddress: `0x${string}`;
}) {
  const { data: commitmentData, isLoading: isCommitmentLoading } =
    useGetCommitment(id);
  const { data: verifiersData } = useGetVerifiers(id);
  const { data: hasVotedData } = useHasVoted(id, walletAddress);
  const { castVote, isPending } = useCastVote();

  const commitment = commitmentData as CommitmentTuple | undefined;
  const isVerifier = useMemo(() => {
    const verifiers = (verifiersData ?? []) as `0x${string}`[];
    return verifiers.some(
      (verifier) => verifier.toLowerCase() === walletAddress.toLowerCase(),
    );
  }, [verifiersData, walletAddress]);

  if (isCommitmentLoading) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
        Loading commitment #{id.toString()}...
      </div>
    );
  }

  if (!commitment || !isVerifier) return null;

  const [creator, title, , stakeAmount, deadline, , , , status] = commitment;
  const hasVoted = Boolean(hasVotedData);
  const voteAvailable = canVote(status, Number(deadline), hasVoted);
  const deadlineDate = new Date(Number(deadline) * 1000).toLocaleDateString();
  const statusLabel = getStatusLabel(status);

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {title || `Commitment #${id.toString()}`}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Creator {shortenAddress(creator)}
          </p>
        </div>
        <span
          className={`w-fit rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses(
            status,
          )}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md bg-black/40 p-3">
          <p className="text-zinc-500">Stake</p>
          <p className="mt-1 font-medium text-white">{formatEth(stakeAmount)} ETH</p>
        </div>
        <div className="rounded-md bg-black/40 p-3">
          <p className="text-zinc-500">Deadline</p>
          <p className="mt-1 font-medium text-white">{deadlineDate}</p>
        </div>
      </div>

      {voteAvailable && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={isPending}
            onClick={() => castVote(id, true)}
            className="rounded-md bg-[#22c55e] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Pass
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => castVote(id, false)}
            className="rounded-md border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-300 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Fail
          </button>
        </div>
      )}
    </article>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: countData, isLoading } = useCommitmentCount();

  const commitmentIds = useMemo(() => {
    const count = Number(countData ?? BigInt(0));
    return Array.from({ length: count }, (_, index) => BigInt(index));
  }, [countData]);

  if (!isConnected || !address) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white">Verifier dashboard</h1>
        <p className="mt-4 text-zinc-300">Connect wallet to view your commitments.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#22c55e]">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          Commitments awaiting your judgment.
        </h1>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
          Loading commitments...
        </div>
      )}

      {!isLoading && commitmentIds.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
          No commitments found yet.
        </div>
      )}

      <div className="space-y-4">
        {commitmentIds.map((id) => (
          <CommitmentCard id={id} key={id.toString()} walletAddress={address} />
        ))}
      </div>
    </section>
  );
}
