import commitmentArtifact from "../../contracts/artifacts/contracts/CommitmentStake.sol/CommitmentStake.json";
import { type Address } from "viem";
import { useReadContract, useWriteContract } from "wagmi";

export const COMMITMENT_CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3" as const;

export const commitmentAbi = commitmentArtifact.abi;

export function useCommitmentCount() {
  return useReadContract({
    address: COMMITMENT_CONTRACT_ADDRESS,
    abi: commitmentAbi,
    functionName: "commitmentCount",
  });
}

export function useGetCommitment(id: bigint) {
  return useReadContract({
    address: COMMITMENT_CONTRACT_ADDRESS,
    abi: commitmentAbi,
    functionName: "commitments",
    args: [id],
  });
}

export function useGetVerifiers(id: bigint) {
  return useReadContract({
    address: COMMITMENT_CONTRACT_ADDRESS,
    abi: commitmentAbi,
    functionName: "getVerifiers",
    args: [id],
  });
}

export function useHasVoted(id: bigint, address?: string) {
  return useReadContract({
    address: COMMITMENT_CONTRACT_ADDRESS,
    abi: commitmentAbi,
    functionName: "hasVoted",
    args: [id, (address ?? "0x0000000000000000000000000000000000000000") as Address],
    query: {
      enabled: Boolean(address),
    },
  });
}

export function useCreateCommitment() {
  const { writeContract, data, error, isPending, isSuccess } = useWriteContract();

  return {
    createCommitment: (args: {
      title: string;
      deadline: bigint;
      charityAddress: Address;
      verifiers: Address[];
      value: bigint;
    }) =>
      writeContract({
        address: COMMITMENT_CONTRACT_ADDRESS,
        abi: commitmentAbi,
        functionName: "createCommitment",
        args: [args.title, args.deadline, args.charityAddress, args.verifiers],
        value: args.value,
      }),
    data,
    error,
    isPending,
    isSuccess,
  };
}

export function useCastVote() {
  const { writeContract, data, error, isPending, isSuccess } = useWriteContract();

  return {
    castVote: (id: bigint, passed: boolean) =>
      writeContract({
        address: COMMITMENT_CONTRACT_ADDRESS,
        abi: commitmentAbi,
        functionName: "castVote",
        args: [id, passed],
      }),
    data,
    error,
    isPending,
    isSuccess,
  };
}
