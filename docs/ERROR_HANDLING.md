# CommitChain Error Handling

## Smart Contract Errors

| Message | Trigger | Fix |
| --- | --- | --- |
| `Must stake ETH` | `createCommitment` called with `msg.value == 0` | Send a positive ETH stake |
| `Deadline must be future` | Deadline is less than or equal to `block.timestamp` | Use a future Unix timestamp |
| `Need at least 1 verifier` | Verifier array is empty | Add at least one verifier address |
| `Invalid charity address` | Charity address is `address(0)` | Use a real recipient address |
| `Not active` | Voting, evidence upload, or deadline resolution after commitment is resolved | Refresh UI and block further actions |
| `Deadline passed` | Verifier tries to vote after deadline | Call `resolveAfterDeadline` instead |
| `Already voted` | Same verifier calls `castVote` twice | Show existing vote state in UI |
| `Not a verifier` | Caller is not listed in the commitment verifier array | Switch wallet or choose the correct verifier |
| `Not creator` | Non-creator calls `uploadEvidence` | Switch to the creator wallet |
| `Deadline not passed` | `resolveAfterDeadline` called before deadline | Wait until the deadline passes |

## Frontend Errors

| Error | Cause | Fix |
| --- | --- | --- |
| Wrong network | MetaMask is not connected to chain ID `31337` for local use | Switch to Hardhat Local |
| Wallet not connected | User has not approved a wallet connection | Connect MetaMask before reading creator/verifier-specific state |
| Transaction failed | Contract reverted, user rejected, gas failed, or local node reset | Surface the wallet error, refresh state, and retry with valid inputs |
| Contract read returns nothing | Local deployment address changed | Redeploy or update the frontend contract address |

## Backend Errors

| Error | Cause | Behavior |
| --- | --- | --- |
| Missing Supabase env vars | `SUPABASE_URL` or `SUPABASE_KEY` absent | Database operations are skipped and empty defaults are returned |
| RPC not configured | `RPC_URL` absent or unreachable | Blockchain operations are skipped with warning logs |
| Supabase not connected | Supabase request fails | Backend logs the exception and returns safe defaults |
| Missing Pinata env vars | `PINATA_API_KEY` or `PINATA_SECRET_KEY` absent | `/api/upload-evidence` returns `503` |
| Pinata request fails | Pinata API returns an error or network fails | `/api/upload-evidence` returns `502` |
| Resolver key missing | `RESOLVER_PRIVATE_KEY` absent | Deadline checker skips resolution transactions |

## Docker Errors

| Error | Cause | Fix |
| --- | --- | --- |
| Build cannot install dependencies | Network, pip, or package index issue | Retry build and confirm `backend/requirements.txt` is reachable |
| Container starts but API unreachable | Port not published | Run with `-p 8000:8000` |
| Env vars missing in container | `.env` not passed to Docker | Use `--env-file backend/.env` or host-level runtime env vars |

## Hardhat Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `nonce too high` | MetaMask account nonce persisted after restarting local chain | Reset the account in MetaMask advanced settings |
| Wrong network | Command or wallet is pointed at the wrong RPC | Use `--network localhost` and MetaMask chain ID `31337` |
| TypeChain/type mismatch | Generated files are stale or missing after a compile change | Remove stale generated folders and rerun `npx hardhat compile` |
| `HH108` or RPC connection errors | Hardhat node is not running | Start `npx hardhat node` |

## GitHub Actions Errors

| Error | Cause | Fix |
| --- | --- | --- |
| ECR auth failure | Bad AWS credentials or region | Check `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` |
| Docker push denied | `ECR_REGISTRY` is wrong or IAM lacks ECR permissions | Confirm registry URI and IAM policy |
| Test failure blocks deploy | Hardhat tests failed in the `test` job | Fix tests locally with `npx hardhat test`, then push again |
| Missing secret | Workflow references an unset GitHub secret | Add the secret in repository settings |
