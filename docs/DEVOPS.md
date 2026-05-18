# CommitChain DevOps

## CI/CD Pipeline

CommitChain uses GitHub Actions to keep the contract test suite in front of deployment. The backend deployment path is container-first: test the smart contracts, build the FastAPI image, authenticate to AWS ECR, and push both immutable and rolling tags.

## Workflows

### `test.yml`

`test.yml` runs on pushes and pull requests targeting `main`.

```text
push/PR to main
  -> checkout
  -> setup Node.js 18
  -> npm install in contracts/
  -> npx hardhat test
```

The current Hardhat suite contains 8 tests covering commitment creation, validation failures, voting permissions, double-vote prevention, and fund release behavior.

### `deploy.yml`

`deploy.yml` runs on pushes to `main`.

```text
push to main
  -> run smart contract tests
  -> configure AWS credentials
  -> login to Amazon ECR
  -> Docker build backend image
  -> push commit SHA tag
  -> push latest tag
```

The deploy job is gated by the test job. If `npx hardhat test` fails, the Docker build and ECR push do not run.

## Docker

The backend Dockerfile uses a multi-stage build:

1. Builder stage starts from `python:3.11-slim`.
2. Dependencies are installed into `/install/deps`.
3. Runtime stage starts from `python:3.11-slim`.
4. Installed dependencies and backend source are copied into `/app`.
5. Uvicorn serves `main:app` on port `8000`.

Build locally:

```bash
cd backend
docker build -t commitchain-backend:local .
docker run --env-file .env -p 8000:8000 commitchain-backend:local
```

## AWS ECR

The workflow expects `ECR_REGISTRY` to be the registry URI, for example:

```text
123456789012.dkr.ecr.ap-south-1.amazonaws.com
```

Images are pushed to:

```text
$ECR_REGISTRY/commitchain-backend:$GITHUB_SHA
$ECR_REGISTRY/commitchain-backend:latest
```

The commit SHA tag is immutable release evidence. The `latest` tag is convenient for simple runtime pulls.

## GitHub Secrets

Configure these repository secrets for CI/CD:

| Secret | Purpose |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | IAM access key used by GitHub Actions |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key used by GitHub Actions |
| `AWS_REGION` | AWS region for ECR |
| `ECR_REGISTRY` | ECR registry hostname |

Runtime secrets are not baked into the image. Provide backend runtime variables through Lambda, ECS, or your chosen host.

## Run Locally

Start the smart contract chain:

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat node
```

Deploy the contract in a second terminal:

```bash
cd contracts
npx hardhat ignition deploy ignition/modules/CommitmentStake.js --network localhost
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Run the backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The default local contract address used by the frontend and backend example env is `0x5FbDB2315678afecb367f032d93F642f64180aa3`, which is the first Hardhat local deployment address.
