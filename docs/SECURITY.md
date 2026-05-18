# CommitChain Security

## Smart Contract Patterns

### Checks-Effects-Interactions

The contract checks commitment status, deadline, caller permissions, and vote state before changing storage or transferring ETH. Resolution updates the commitment status before transferring the staked funds.

### Reentrancy Prevention

The contract does not call arbitrary external contracts during normal voting logic. ETH transfers happen after state changes and use Solidity `transfer`, which forwards limited gas. If future versions switch to `call`, add a reentrancy guard before shipping.

### Access Control

`castVote` verifies that `msg.sender` appears in the commitment verifier list before a vote is counted. `uploadEvidence` requires the original creator.

### Double-Vote Prevention

`hasVoted[commitmentId][verifier]` blocks repeat votes from the same verifier.

### Integer Overflow Protection

The contract uses Solidity `^0.8.19`, which has built-in arithmetic overflow and underflow checks.

### Input Validation

The contract uses `require` checks for non-zero stake, future deadlines, at least one verifier, non-zero charity address, active status, deadline windows, creator-only evidence upload, and verifier-only voting.

## Pre-Deploy Checklist

- Run `npx hardhat test` from `contracts/`.
- Confirm `.env` files are ignored and never staged.
- Use a dedicated deployer wallet with limited funds.
- Verify the charity address before deployment or demo use.
- Confirm frontend contract address and backend `CONTRACT_ADDRESS` match the deployed contract.
- Confirm backend runtime secrets are configured in the host, not committed to the repo.
- Review verifier list UX so users understand that verifier choice is a trust decision.
- Keep resolver private keys out of local shell history and CI logs.

## Known Limitations

### Verifier Social Trust

CommitChain can enforce votes and stake movement, but it cannot prove that verifiers are fair, available, or socially aligned with the creator. A creator should choose verifiers carefully.

### `block.timestamp` Manipulation

Deadlines rely on `block.timestamp`. Validators can influence timestamps slightly, so deadlines should not depend on second-level precision.

## Private Key Safety

Private keys belong in local or hosted environment variables only. The root `.gitignore` ignores:

```text
.env
.env.local
.env.*
!.env.example
contracts/.env
frontend/.env*
backend/.env
```

`backend/.env.example` is intentionally allowed because it contains empty placeholders only. Never paste funded wallet private keys into source files, docs, tests, or CI logs.

## Backend Security

The FastAPI app uses CORS middleware with `allow_origins=["*"]` for local/demo flexibility. Tighten this to the production frontend origin before public deployment.

Environment-dependent services fail closed or degrade gracefully:

- Missing Supabase credentials return empty database results and log a warning.
- Missing RPC configuration skips blockchain reads and deadline checks.
- Missing resolver private key skips deadline resolution transactions.
- Missing Pinata credentials reject uploads with `503`.
- Missing notification credentials skip email or Telegram sends.
