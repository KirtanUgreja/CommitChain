# 🔒 CommitChain

> "Lock ETH. Keep your word. Or lose it — for real."

CommitChain is a blockchain accountability app for staking ETH on personal commitments. A creator locks funds, names trusted verifiers, uploads evidence, and lets verifier votes decide whether the stake returns to the creator or goes to charity.

The key reason this belongs on-chain is custody. A database can record promises, but a smart contract can hold the stake, enforce voting rules, and execute the outcome without asking the app owner to be trusted with the money. The current project is built for a local Hardhat testnet demo.

## Tech Stack

| Area | Technology |
| --- | --- |
| Smart contract | Solidity |
| Contract tooling | Hardhat |
| Frontend | Next.js 14 |
| Wallet integration | wagmi v2 |
| Backend | FastAPI |
| Packaging | Docker |
| Registry | AWS ECR |
| CI/CD | GitHub Actions |

## Architecture

```text
+--------------------------------------------------------------+
| FastAPI Backend                                               |
| Docker + AWS Lambda + Mangum + ECR                            |
| Notifications, Supabase cache, IPFS upload, deadline checker  |
+-----------------------------^--------------------------------+
                              |
+-----------------------------|--------------------------------+
| Next.js Frontend                                               |
| wagmi + viem + MetaMask                                        |
| Creator flow, verifier dashboard, contract interactions        |
+-----------------------------^--------------------------------+
                              |
+-----------------------------|--------------------------------+
| Ethereum Smart Contract                                        |
| CommitmentStake.sol                                            |
| ETH escrow, verifier votes, automatic stake resolution         |
+--------------------------------------------------------------+
```

See [docs/ARCHITECTURE.md](/Users/kirtan/Documents/Projects/CommitChain/docs/ARCHITECTURE.md) for the full architecture.

## Quick Start

Full setup lives in [docs/STARTUP.md](/Users/kirtan/Documents/Projects/CommitChain/docs/STARTUP.md).

```bash
cd contracts && npm install && npx hardhat compile
npx hardhat node
npx hardhat ignition deploy ignition/modules/CommitmentStake.js --network localhost
cd ../frontend && npm install && npm run dev
cd ../backend && pip install -r requirements.txt && uvicorn main:app --reload
```

Connect MetaMask to `http://127.0.0.1:8545` with chain ID `31337`, then import a local Hardhat test account.

## Project Structure

```text
CommitChain/
|-- .github/workflows/   GitHub Actions test and ECR deployment workflows
|-- contracts/           Hardhat v2 Solidity contract and tests
|-- frontend/            Next.js 14 app using wagmi v2 and viem
|-- backend/             FastAPI service for notifications, stats, IPFS, Lambda
|-- docs/                Architecture, DevOps, Security, API, startup docs
`-- README.md            Portfolio-grade project overview
```

## CI/CD Pipeline

The CI workflow runs Hardhat tests on pushes and pull requests to `main`. The deploy workflow runs on pushes to `main`, blocks deployment if tests fail, builds the backend Docker image, authenticates to AWS ECR, and pushes both `latest` and commit SHA tags.

More detail: [docs/DEVOPS.md](/Users/kirtan/Documents/Projects/CommitChain/docs/DEVOPS.md).

## Core Smart Contract Functions

| Function | Purpose |
| --- | --- |
| `createCommitment` | Stake ETH, set a future deadline, choose charity and verifiers |
| `castVote` | Let an approved verifier vote pass or fail before the deadline |
| `uploadEvidence` | Let the creator attach an IPFS evidence hash |
| `resolveAfterDeadline` | Resolve unresolved commitments after the deadline |

## API

The FastAPI backend exposes health checks, commitment notifications, wallet commitment lookup, wallet stats, and evidence upload. Run the backend locally and open Swagger UI at `http://127.0.0.1:8000/docs`.

Endpoint documentation: [docs/API.md](/Users/kirtan/Documents/Projects/CommitChain/docs/API.md).

## Security

CommitChain uses verifier access control, double-vote prevention, deadline checks, Solidity 0.8 overflow protection, and state updates before stake transfers. Environment files are ignored at the root and package level, and secret placeholders live only in `.env.example`.

Security notes and limitations: [docs/SECURITY.md](/Users/kirtan/Documents/Projects/CommitChain/docs/SECURITY.md).

## Local Demo Flow

1. Start Hardhat and deploy the contract.
2. Run the frontend and backend.
3. Connect MetaMask to chain ID `31337`.
4. Create a commitment with a local test account.
5. Switch to a verifier account and cast a vote.
6. Watch the contract return the stake or send it to charity based on the vote.

## Documentation

- [Architecture](/Users/kirtan/Documents/Projects/CommitChain/docs/ARCHITECTURE.md)
- [DevOps](/Users/kirtan/Documents/Projects/CommitChain/docs/DEVOPS.md)
- [Security](/Users/kirtan/Documents/Projects/CommitChain/docs/SECURITY.md)
- [Startup](/Users/kirtan/Documents/Projects/CommitChain/docs/STARTUP.md)
- [Error Handling](/Users/kirtan/Documents/Projects/CommitChain/docs/ERROR_HANDLING.md)
- [API](/Users/kirtan/Documents/Projects/CommitChain/docs/API.md)
