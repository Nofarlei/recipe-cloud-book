---
name: create-ci-workflows
description: Scaffold the three planned GitHub Actions workflows for this project: deploy-backend, deploy-frontend, and quality-gate. Specs are drawn from PRD.md. Run this when ready to wire up CI/CD.
disable-model-invocation: true
---

Create the three GitHub Actions workflows described in PRD.md.

## Workflows to create

### 1. `.github/workflows/quality-gate.yml`
- **Trigger**: push/PR on any branch
- **Jobs**:
  - Run `python -m py_compile` on all Lambda files (`backend/*/lambda_function.py`)
  - Run `pytest backend/` for all tests
  - (Optional) parse JS with `acorn` if available

### 2. `.github/workflows/deploy-backend.yml`
- **Trigger**: push to `main` when files under `backend/**` change
- **Permissions**: `id-token: write`, `contents: read` (for OIDC)
- **Steps**:
  1. Checkout code
  2. Configure AWS credentials via OIDC (`aws-actions/configure-aws-credentials@v4`)
     - Role ARN from secret: `AWS_DEPLOY_ROLE_ARN`
     - Region: `eu-central-1` (or whichever region the stack uses)
  3. For each of the 4 Lambda functions: zip `lambda_function.py` and call `aws lambda update-function-code`
  4. Wait for each update to complete

### 3. `.github/workflows/deploy-frontend.yml`
- **Trigger**: push to `main` when files under `frontend/**` change
- **Permissions**: `id-token: write`, `contents: read` (for OIDC)
- **Steps**:
  1. Checkout code
  2. Configure AWS credentials via OIDC
  3. `aws s3 sync frontend/ s3://<BUCKET_NAME> --delete`
  4. `aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"`
  5. Use secrets: `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`

## Steps

1. Read PRD.md to confirm any details not listed above (region, Lambda names, etc.).
2. Create `.github/workflows/` if it doesn't exist.
3. Write all three workflow files.
4. After writing, print a checklist of GitHub repository secrets the user needs to add:
   - `AWS_DEPLOY_ROLE_ARN`
   - `S3_BUCKET_NAME`
   - `CLOUDFRONT_DISTRIBUTION_ID`
5. Remind the user that the OIDC trust policy must be configured on the IAM role to allow the GitHub repo.
