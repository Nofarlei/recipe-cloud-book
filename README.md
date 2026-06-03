# Recipe Cloud Book

A serverless personal recipe manager — save, search, and manage recipes with image uploads, backed entirely by AWS.

## Live Application

**[https://rcb.proj.rotem.click](https://rcb.proj.rotem.click)**

## Team

- Yarden Biton
- Nofar Leibovich

## Features

- Email-based identity — no passwords, recipes are scoped to your email address
- Add recipes with name, category, prep time, ingredients, and instructions
- Upload a recipe image (stored in S3 via pre-signed URL, served via CloudFront)
- Browse and search recipes by name or category
- Delete recipes

## Architecture

```
Browser
  │
  ├── HTTPS ──► CloudFront (rcb.proj.rotem.click)
  │               ├── /*          ──► S3 (frontend bucket)
  │               └── /images/*   ──► S3 (images bucket, private via OAC)
  │
  └── API ────► API Gateway (HTTP API v2)
                  ├── POST   /recipes             ──► Lambda: create_recipe
                  ├── GET    /recipes             ──► Lambda: list_recipes
                  ├── DELETE /recipes/{id}        ──► Lambda: delete_recipe
                  └── GET    /recipes/upload-url  ──► Lambda: get_upload_url
                                                            │
                                                   DynamoDB (recipe metadata)
                                                   S3 pre-signed PUT (images)
```

## AWS Services

| Service | Role |
|---|---|
| **S3** | Hosts the static frontend; stores recipe images in a separate private bucket |
| **CloudFront** | CDN — serves frontend and images over HTTPS via custom domain |
| **API Gateway** | HTTP API (v2) exposing 4 routes to the Lambda functions |
| **Lambda** | Serverless backend — 4 Python 3.12 functions for CRUD and pre-signed URLs |
| **DynamoDB** | Stores recipe metadata (PK: `email`, SK: `recipeId`) |
| **ACM** | TLS certificate for `rcb.proj.rotem.click` (provisioned in us-east-1) |
| **Route 53** | DNS hosted zone — A alias record pointing the custom domain to CloudFront |
| **IAM** | OIDC identity provider + role scoped to GitHub Actions for keyless deploys |
| **CloudWatch** | Automatic Lambda execution logs and metrics |

## CI/CD

Three GitHub Actions workflows run automatically on every push to `main`:

| Workflow | Trigger | What it does |
|---|---|---|
| `quality-gate.yml` | Every push + PR (all branches) | Syntax-checks all Lambda files, runs 14 pytest unit tests, syntax-checks `app.js` |
| `deploy-backend.yml` | Push to `main` touching `backend/**` | Zips and deploys all 4 Lambda functions via `aws lambda update-function-code` |
| `deploy-frontend.yml` | Push to `main` touching `frontend/**` | Syncs `frontend/` to S3 and invalidates the CloudFront cache |

All workflows authenticate via OIDC — no long-lived AWS keys stored in secrets.

## Development Setup

**Prerequisites:** Python 3.12, pytest, boto3

```bash
git clone https://github.com/Nofarlei/recipe-cloud-book.git
cd recipe-cloud-book
pip install pytest boto3
pytest backend/   # runs all 14 unit tests
```

## Deployment

Deployment is fully automated via GitHub Actions on push to `main`. To trigger manually:

```bash
gh workflow run deploy-backend.yml
gh workflow run deploy-frontend.yml
```

**Required GitHub Secrets:**

| Secret | Description |
|---|---|
| `AWS_ROLE_TO_ASSUME` | IAM role ARN for OIDC authentication |
| `AWS_REGION` | AWS region (e.g. `eu-central-1`) |
| `FRONTEND_BUCKET_NAME` | S3 bucket name for the static frontend |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |
| `CREATE_RECIPE_LAMBDA_NAME` | Lambda function name |
| `LIST_RECIPES_LAMBDA_NAME` | Lambda function name |
| `DELETE_RECIPE_LAMBDA_NAME` | Lambda function name |
| `GET_UPLOAD_URL_LAMBDA_NAME` | Lambda function name |
| `IMAGES_BUCKET_NAME` | S3 bucket name for recipe images |

## Technologies

- Python 3.12 (Lambda), pytest
- Vanilla HTML / CSS / ES modules (no build step)
- GitHub Actions (CI/CD)
- AWS: S3, CloudFront, API Gateway, Lambda, DynamoDB, Route 53, ACM, IAM, CloudWatch
