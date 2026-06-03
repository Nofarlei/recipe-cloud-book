# Pipeline — Recipe Cloud Book
> A serverless personal recipe manager with AWS backend and live deployment

Started: 2026-06-03 | Last updated: 2026-06-03

## Progress

| # | Stage | Status | Output |
|---|---|---|---|
| 1 | grill-me | ✅ done | 17 decisions locked, email-scoped serverless CRUD with pre-signed image upload |
| 2 | to-prd | ✅ done | PRD.md, 22 user stories, 4 Lambda contracts defined |
| 3 | to-issues | ✅ done | 10 issues on github.com/Nofarlei/recipe-cloud-book (#1–#10) |
| 4 | tdd | ✅ done | 14 tests passing across 4 Lambdas (pytest backend/) |
| 5 | ralph-loop | ⏸ skipped | — |
| 6 | improve-codebase-architecture | ⏳ pending | — |

## Stage Notes

### tdd
Repo restructured (Issue #1 closed). 4 Lambda implementations + 14 pytest tests all passing. Each test file uses importlib.util to load its lambda under a unique module name (e.g. list_recipes_lambda) to avoid sys.modules cache collisions when running pytest backend/ from the project root. pytest.ini sets --import-mode=importlib. conftest.py in backend/ provides module isolation fixture.

### to-issues
10 issues published to github.com/Nofarlei/recipe-cloud-book (#1–#10). Dependency order: #1 (repo restructure) → #2 (AWS infra, HITL) + #3 (email UI) → #4 (list) → #5 (create) → #6 (image upload) + #7 (delete) → #8 (CI/CD) → #9 (domain, HITL) → #10 (README).

### to-prd
PRD.md saved to project root. 22 user stories, full API contract (4 routes), DynamoDB schema, S3/CloudFront architecture, 3 CI/CD workflow specs, pytest testing decisions for all 4 Lambdas. Out of scope: Cognito, editing, pagination, IaC.

### grill-me
17 decisions locked across auth, data model, Lambda structure, CI/CD, and UX. Email-scoped identity (no password), PK=email/SK=recipeId in DynamoDB, 4 Lambdas (Python 3.12), HTTP API v2, 2 S3 buckets, 1 CloudFront distribution (2 origins), 3 GitHub Actions workflows with OIDC, domain rcb.proj.rotem.click, pre-signed URL image upload, client-side search, inline error handling.
