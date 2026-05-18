"use client";

import { type FormEvent, useMemo, useState } from "react";
import { type Address, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useCreateCommitment } from "@/hooks/useCommitmentContract";
import {
  isFutureDate,
  isValidAddress,
  validateStake,
} from "@/lib/validation";

const GITCOIN_ADDRESS = "0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6";

type FormErrors = {
  title?: string;
  deadline?: string;
  stake?: string;
  verifiers?: string;
  charity?: string;
};

function compactError(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message.split("\n")[0];
  return "Transaction failed. Please try again.";
}

export default function CreateCommitmentPage() {
  const { isConnected } = useAccount();
  const { createCommitment, data, error, isPending, isSuccess } =
    useCreateCommitment();

  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [stake, setStake] = useState("0.001");
  const [verifiers, setVerifiers] = useState([""]);
  const [charityAddress, setCharityAddress] = useState(GITCOIN_ADDRESS);
  const [errors, setErrors] = useState<FormErrors>({});

  const transactionError = useMemo(() => compactError(error), [error]);

  function validateForm() {
    const nextErrors: FormErrors = {};
    const trimmedTitle = title.trim();
    const verifierValues = verifiers.map((value) => value.trim());

    if (!trimmedTitle) nextErrors.title = "Title is required.";

    if (!deadline || !isFutureDate(new Date(`${deadline}T23:59:59`))) {
      nextErrors.deadline = "Choose a future deadline.";
    }

    if (!validateStake(stake)) {
      nextErrors.stake = "Stake must be at least 0.001 ETH.";
    }

    if (verifierValues.length < 1 || verifierValues.some((value) => !value)) {
      nextErrors.verifiers = "Add at least one verifier address.";
    } else if (verifierValues.some((value) => !isValidAddress(value))) {
      nextErrors.verifiers = "Every verifier must be a valid Ethereum address.";
    }

    if (!isValidAddress(charityAddress.trim())) {
      nextErrors.charity = "Enter a valid charity address.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function updateVerifier(index: number, value: string) {
    setVerifiers((current) =>
      current.map((verifier, verifierIndex) =>
        verifierIndex === index ? value : verifier,
      ),
    );
  }

  function removeVerifier(index: number) {
    setVerifiers((current) =>
      current.length === 1
        ? [""]
        : current.filter((_, verifierIndex) => verifierIndex !== index),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConnected || !validateForm()) return;

    createCommitment({
      title: title.trim(),
      deadline: BigInt(Math.floor(new Date(`${deadline}T23:59:59`).getTime() / 1000)),
      charityAddress: charityAddress.trim() as Address,
      verifiers: verifiers.map((value) => value.trim() as Address),
      value: parseEther(stake),
    });
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#22c55e]">
          New commitment
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          Put real ETH behind a promise.
        </h1>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-lg border border-white/10 bg-white/[0.03] p-5 sm:p-6"
      >
        <div>
          <label className="block text-sm font-medium text-zinc-200" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-black px-3 py-2 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#22c55e]"
            placeholder="Ship the MVP"
          />
          {errors.title && <p className="mt-2 text-sm text-red-400">{errors.title}</p>}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium text-zinc-200"
              htmlFor="deadline"
            >
              Deadline
            </label>
            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-black px-3 py-2 text-white outline-none transition focus:border-[#22c55e]"
            />
            {errors.deadline && (
              <p className="mt-2 text-sm text-red-400">{errors.deadline}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-200" htmlFor="stake">
              Stake ETH
            </label>
            <input
              id="stake"
              type="number"
              min="0.001"
              step="0.001"
              value={stake}
              onChange={(event) => setStake(event.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-black px-3 py-2 text-white outline-none transition focus:border-[#22c55e]"
            />
            {errors.stake && <p className="mt-2 text-sm text-red-400">{errors.stake}</p>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-zinc-200">
              Verifier addresses
            </label>
            <button
              type="button"
              onClick={() => setVerifiers((current) => [...current, ""])}
              className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:border-[#22c55e]/70 hover:bg-white/5"
            >
              Add
            </button>
          </div>
          <div className="mt-2 space-y-3">
            {verifiers.map((verifier, index) => (
              <div className="flex gap-2" key={index}>
                <input
                  value={verifier}
                  onChange={(event) => updateVerifier(index, event.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-black px-3 py-2 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#22c55e]"
                  placeholder="0x..."
                />
                <button
                  type="button"
                  onClick={() => removeVerifier(index)}
                  className="rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-red-400/70 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {errors.verifiers && (
            <p className="mt-2 text-sm text-red-400">{errors.verifiers}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-200" htmlFor="charity">
            Charity address
          </label>
          <input
            id="charity"
            value={charityAddress}
            onChange={(event) => setCharityAddress(event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-black px-3 py-2 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#22c55e]"
            placeholder={`Gitcoin = ${GITCOIN_ADDRESS}`}
          />
          {errors.charity && (
            <p className="mt-2 text-sm text-red-400">{errors.charity}</p>
          )}
        </div>

        {!isConnected && (
          <p className="rounded-md border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-2 text-sm text-[#86efac]">
            Connect wallet to continue.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={!isConnected || isPending}
            className="rounded-md bg-[#22c55e] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating..." : "Create Commitment"}
          </button>
          {isSuccess && data && (
            <p className="text-sm text-[#86efac]">
              Commitment created! Transaction hash: {data}
            </p>
          )}
          {transactionError && (
            <p className="text-sm text-red-400">{transactionError}</p>
          )}
        </div>
      </form>
    </section>
  );
}
