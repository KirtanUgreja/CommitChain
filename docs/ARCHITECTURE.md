# CommitChain Architecture

CommitChain is a three-layer accountability app that lets a user stake ETH against a real-world commitment, appoint trusted verifiers, and let the contract release or redirect the stake based on votes. The smart contract owns the stake and final state, the frontend handles wallet-driven user flows, and the backend mirrors useful data, notifications, evidence upload, and deadline automation.

## System Layers

```text
+--------------------------------------------------------------+
| Layer 3: FastAPI Backend                                      |
| Docker + AWS Lambda + Mangum + AWS ECR                        |
| Notifications, Supabase cache, IPFS upload, deadline checker  |
+-----------------------------^--------------------------------+
                              |
+-----------------------------|--------------------------------+
| Layer 2: Next.js Frontend                                      |
| Next.js 14 + wagmi + viem + MetaMask                          |
| Create commitments, upload evidence, verifier voting UI        |
+-----------------------------^--------------------------------+
                              |
+-----------------------------|--------------------------------+
| Layer 1: Ethereum Smart Contract                              |
| CommitmentStake.sol                                           |
| Escrows ETH, stores commitments, records votes, resolves stake |
+--------------------------------------------------------------+
```

## Data Flow

```text
User
  -> MetaMask
  -> Smart Contract
  -> Verifier
  -> Vote
  -> Resolution
```

1. A user creates a commitment in the Next.js frontend and signs the transaction in MetaMask.
2. `CommitmentStake.sol` stores the title, stake, deadline, charity address, and verifier list.
3. The backend can fetch the new commitment, cache it in Supabase, and notify verifiers.
4. The user uploads evidence through the backend, which pins the file through Pinata and returns an IPFS hash.
5. Verifiers cast pass/fail votes from the frontend through MetaMask.
6. The contract resolves immediately on majority or after the deadline through `resolveAfterDeadline`.

## Tech Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Smart contract | Solidity | Commitment escrow, vote accounting, resolution rules |
| Smart contract tooling | Hardhat | Local node, compilation, deployment, tests |
| Frontend | Next.js 14 | App router UI for creators and verifiers |
| Wallet integration | wagmi | React hooks for contract reads and writes |
| Ethereum utilities | viem | Typed addresses, bigint values, chain helpers |
| Backend | FastAPI | HTTP API for notifications, stats, evidence upload |
| Lambda adapter | Mangum | Runs FastAPI on AWS Lambda |
| Packaging | Docker | Container image for backend deployment |
| Registry | AWS ECR | Stores backend container images |
| Automation | GitHub Actions | Test, build, and push pipeline |

## Smart Contract

The contract is implemented in `contracts/contracts/CommitmentStake.sol`.

### `createCommitment`

Creates a new active commitment. The caller must stake ETH, choose a future deadline, provide at least one verifier, and provide a non-zero charity address. The contract stores the creator, title, stake amount, deadline, charity address, verifier list, and active status.

### `castVote`

Allows a verifier to vote pass or fail before the deadline. The function checks that the commitment is active, the deadline has not passed, the caller has not already voted, and the caller is in the verifier list. It records the vote and attempts majority resolution.

### `uploadEvidence`

Stores an IPFS hash for a commitment. Only the original creator can upload evidence, and only while the commitment is active.

### `resolveAfterDeadline`

Allows anyone to resolve an active commitment after the deadline. If pass votes exceed fail votes, the stake returns to the creator. Otherwise the stake is sent to the configured charity address.

## Database Schema

The backend is designed to use Supabase as a cache and notification support layer. The on-chain contract remains the source of truth for stake custody and final status.

### `commitments`

| Column | Purpose |
| --- | --- |
| `id` | On-chain commitment id |
| `creator` | Lowercase wallet address of the creator |
| `title` | Commitment title |
| `evidence_ipfs_hash` | Latest evidence hash |
| `stake_amount` | Staked wei amount |
| `deadline` | Unix timestamp deadline |
| `charity_address` | Recipient on failed commitment |
| `verifiers` | Array of verifier wallet addresses |
| `pass_votes` | Cached pass vote count |
| `fail_votes` | Cached fail vote count |
| `status` | `ACTIVE`, `COMPLETED`, or `FAILED` |

### `verifiers`

| Column | Purpose |
| --- | --- |
| `address` | Verifier wallet address |
| `email` | Optional email destination |
| `telegram_chat_id` | Optional Telegram destination |
| `created_at` | Row creation timestamp |

### `notifications`

| Column | Purpose |
| --- | --- |
| `id` | Notification row id |
| `commitment_id` | Related commitment |
| `verifier` | Recipient wallet address |
| `channel` | `email` or `telegram` |
| `status` | Send result |
| `created_at` | Send timestamp |

### `wallet_stats`

| Column | Purpose |
| --- | --- |
| `address` | Wallet address |
| `total` | Total resolved commitments |
| `completed` | Successful commitments |
| `failed` | Failed commitments |
| `streak` | Current completion streak |
