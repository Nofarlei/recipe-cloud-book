# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Serverless recipe management app (AWS). Backend: 4 Python 3.12 Lambda functions. Frontend: vanilla HTML/CSS/JS. CI/CD: GitHub Actions workflows planned but not yet created — see PRD.md for full specs.

## Commands

Run all tests (always from project root):
```bash
pytest backend/
```

Never run individual test files directly. The `conftest.py` module isolation fixture at the root is required for all tests to work correctly.

## Architecture

- `backend/` — 4 Lambda functions: `create_recipe`, `list_recipes`, `delete_recipe`, `get_upload_url`
- `frontend/` — static files (S3 + CloudFront in production); currently uses localStorage pending API integration

## Lambda patterns

- Handler signature: extract header/params → validate → boto3 call → return `{statusCode, body}`
- User identity via `x-user-email` request header — Cognito is out of scope
- Images stored in S3 only; DynamoDB stores the S3 key (`imageKey`), never the image data
- Env vars with defaults: `DYNAMODB_TABLE` (default: `recipe-cloud-book-recipes`), `IMAGES_BUCKET` (default: `recipe-cloud-book-images`)
- Use print statements for logging — required for CloudWatch; do not swap for the logging module

## Testing

- boto3 is always mocked — no real AWS calls locally
- Module isolation via `importlib.util` (one unique module name per Lambda test file) is intentional — do not change this pattern
- `pytest.ini` sets `--import-mode=importlib`; `conftest.py` clears `lambda_function` from `sys.modules` before/after each test

## Frontend

- No build step, no package manager — pure HTML/CSS/JS
- `app.js` uses localStorage (`recipeCloudBookRecipes` key) now; `syncRecipesToCloud()` is the placeholder for future API calls
- All user content is rendered through `escapeHtml()` — preserve this for XSS safety
