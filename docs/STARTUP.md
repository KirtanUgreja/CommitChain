# CommitChain Startup Guide

This guide gets the full local stack running from a clean checkout.

## Step 1: Clone Repo

```bash
git clone <repo-url>
cd CommitChain
```

## Step 2: Install Contracts Dependencies and Compile

```bash
cd contracts
npm install
npx hardhat compile
```

## Step 3: Start Hardhat Node

Keep this terminal running:

```bash
npx hardhat node
```

## Step 4: Deploy Contract Locally

Open a second terminal:

```bash
cd contracts
npx hardhat ignition deploy ignition/modules/CommitmentStake.js --network localhost
```

For a fresh Hardhat node, the first deployment address is usually:

```text
0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Step 5: Install and Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the local Next.js URL, usually `http://localhost:3000`.

## Step 6: Install and Run Backend

Create `backend/.env` from `backend/.env.example`, then run:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`.

## Step 7: Connect MetaMask to Localhost

Add a custom network:

| Field | Value |
| --- | --- |
| Network name | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | `ETH` |

## Step 8: Import Test Account

Import Hardhat Account #0 into MetaMask using the private key printed by `npx hardhat node`. This account is funded only on the local Hardhat testnet. Do not use it on public networks.

## Step 9: Create Commitment and Test Verifier Dashboard

1. Open the frontend.
2. Connect MetaMask on chain `31337`.
3. Create a commitment with a stake, deadline, charity address, and verifier address.
4. Switch MetaMask to the verifier account.
5. Open the dashboard and cast a pass/fail vote.
6. Confirm the contract updates the commitment status once a majority is reached.

## Environment Variables

### Contracts

| Variable | Required | Purpose |
| --- | --- | --- |
| `SEPOLIA_RPC_URL` | Testnet only | RPC endpoint for Sepolia deployment |
| `PRIVATE_KEY` | Testnet only | Deployer private key |
| `ETHERSCAN_API_KEY` | Optional | Contract verification |

### Frontend

The current frontend uses the local Hardhat deployment address directly in `frontend/hooks/useCommitmentContract.ts`. If you deploy to another address, update `COMMITMENT_CONTRACT_ADDRESS`.

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `RPC_URL` | Local blockchain features | Ethereum RPC URL |
| `CONTRACT_ADDRESS` | Local blockchain features | Deployed CommitmentStake address |
| `SUPABASE_URL` | Optional | Supabase project URL |
| `SUPABASE_KEY` | Optional | Supabase service or anon key |
| `RESEND_API_KEY` | Optional | Email notifications |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram notifications |
| `PINATA_API_KEY` | Evidence upload | Pinata API key |
| `PINATA_SECRET_KEY` | Evidence upload | Pinata secret key |
| `RESOLVER_PRIVATE_KEY` | Deadline automation | Wallet that calls `resolveAfterDeadline` |
| `CHAIN_ID` | Optional | Defaults to `31337` |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| MetaMask shows wrong network | Wallet is not on Hardhat Local | Switch to chain ID `31337` |
| Contract reads fail | Contract address does not match local deployment | Redeploy or update `COMMITMENT_CONTRACT_ADDRESS` and backend `CONTRACT_ADDRESS` |
| `nonce too high` | MetaMask has stale local nonce after restarting Hardhat | Reset the account in MetaMask advanced settings |
| `Deadline must be future` | Deadline timestamp is in the past | Choose a future time |
| Backend returns empty commitments | Supabase env vars are missing | Configure `SUPABASE_URL` and `SUPABASE_KEY`, or accept local no-op behavior |
| Upload returns `503` | Pinata credentials missing | Set `PINATA_API_KEY` and `PINATA_SECRET_KEY` |
| TypeChain import errors | Generated types do not match current build | Delete stale `typechain` or `typechain-types`, then rerun `npx hardhat compile` |
