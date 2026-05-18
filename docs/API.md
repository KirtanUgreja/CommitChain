# CommitChain API

The backend is a FastAPI app. When running locally, open Swagger UI at:

```text
http://127.0.0.1:8000/docs
```

## `GET /health`

Returns API health.

### Response

```json
{
  "status": "ok"
}
```

### cURL

```bash
curl http://127.0.0.1:8000/health
```

## `POST /api/commitment-created`

Fetches a commitment and verifier list from the contract, then attempts to notify verifiers using configured channels.

### Request Body

```json
{
  "commitment_id": 0
}
```

### Response

```json
{
  "success": true
}
```

### cURL

```bash
curl -X POST http://127.0.0.1:8000/api/commitment-created \
  -H "Content-Type: application/json" \
  -d '{"commitment_id":0}'
```

## `GET /api/commitments/{address}`

Returns cached commitments where the address is the creator or a verifier.

### Example Request

```text
GET /api/commitments/0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
```

### Response

```json
[
  {
    "id": 0,
    "creator": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "title": "Exercise 5 days",
    "evidence_ipfs_hash": "QmExample",
    "stake_amount": 10000000000000000,
    "deadline": 1767225600,
    "charity_address": "0x0000000000000000000000000000000000000001",
    "verifiers": ["0x0000000000000000000000000000000000000002"],
    "pass_votes": 1,
    "fail_votes": 0,
    "status": "COMPLETED"
  }
]
```

### cURL

```bash
curl http://127.0.0.1:8000/api/commitments/0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
```

If Supabase is not configured, the endpoint returns an empty list.

## `GET /api/stats/{address}`

Returns cached wallet statistics.

### Example Request

```text
GET /api/stats/0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
```

### Response

```json
{
  "total": 3,
  "completed": 2,
  "failed": 1,
  "streak": 1
}
```

### cURL

```bash
curl http://127.0.0.1:8000/api/stats/0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
```

If Supabase is not configured, the endpoint returns zeroed stats.

## `POST /api/upload-evidence`

Uploads a multipart file to Pinata and returns the IPFS hash.

### Request

Field name: `file`

```bash
curl -X POST http://127.0.0.1:8000/api/upload-evidence \
  -F "file=@./evidence.png"
```

### Response

```json
{
  "ipfs_hash": "QmExampleHash"
}
```

### Error Responses

```json
{
  "detail": "Pinata is not configured"
}
```

```json
{
  "detail": "Pinata upload failed"
}
```

Use Swagger UI at `/docs` to upload a test file from the browser.
