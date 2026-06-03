# PRD — Recipe Cloud Book

## Problem Statement

Users have recipes scattered across notes apps, photos, and memory. There is no dedicated personal space to save, organize, and reliably access favorite recipes from any device. Recipes saved locally in a browser are lost when switching devices or clearing browser data.

## Solution

Recipe Cloud Book is a serverless web application that lets users save, organize, search, and manage their personal recipe collection in the cloud. Users identify themselves with their email address — no password required. Recipes are stored in AWS DynamoDB, images in AWS S3, and the application is served globally via CloudFront. The system is deployed automatically via GitHub Actions on every push to `main`.

## User Stories

1. As a new user, I want to be prompted for my email address on first visit, so that my recipes are saved under my identity.
2. As a returning user, I want to be recognized automatically on return visits, so that I can see my recipe collection without re-entering my email.
3. As a user, I want to see a "Logged in as" badge showing my email, so that I know which account I'm viewing.
4. As a user, I want a "Change" link next to my email badge, so that I can switch to a different email identity.
5. As a user, I want to add a new recipe with a name, category, prep time, ingredients, and instructions, so that I can capture a meal idea in one place.
6. As a user, I want to upload a photo for my recipe, so that I can visually identify dishes in my collection.
7. As a user, I want to choose a category (Breakfast, Lunch, Dinner, Dessert, Snack) for each recipe, so that I can organize my collection by meal type.
8. As a user, I want to see a loading indicator while my recipe is being saved, so that I know the system is working.
9. As a user, I want to see a success message after saving a recipe, so that I know it was stored correctly.
10. As a user, I want to see a clear error message if saving fails, so that I can retry without confusion.
11. As a user, I want my saved recipes displayed as cards with name, category, prep time, and date added, so that I can browse my collection at a glance.
12. As a user, I want recipe images displayed on each card, so that I can visually identify dishes.
13. As a user, I want to search recipes by name or category, so that I can quickly find a specific dish.
14. As a user, I want search results to update as I type, so that I get instant feedback.
15. As a user, I want to delete a recipe from my collection, so that I can remove dishes I no longer use.
16. As a user, I want my recipe collection to be accessible from any device using my email, so that I am not tied to one browser.
17. As a user, I want the application to load over HTTPS with a custom domain (rcb.proj.rotem.click), so that I can share a professional link.
18. As a developer, I want backend Lambda functions deployed automatically when `backend/` changes, so that I can ship fixes without manual steps.
19. As a developer, I want frontend assets deployed automatically when `frontend/` changes, so that the S3 bucket and CloudFront cache stay current.
20. As a developer, I want a Quality Gate workflow to validate Python syntax and JS correctness on every push, so that broken code never reaches production.
21. As a developer, I want AWS credentials managed via OIDC, so that no long-lived secrets are stored in the repository.
22. As a developer, I want CloudWatch logs on every Lambda invocation, so that I can debug failures during development and the live demo.

## Implementation Decisions

### Identity
- Email is collected via a modal overlay on first page load (no email in localStorage).
- Email is persisted to `localStorage` under key `rcb_user_email`.
- All API requests send the email as an `x-user-email` HTTP header.
- A "Logged in as: email" badge with a "Change" link appears in the page header. Clicking "Change" clears the key and re-triggers the modal.

### DynamoDB
- Single table: `recipe-cloud-book-recipes`
- Partition key: `email` (String)
- Sort key: `recipeId` (String, UUID v4 generated client-side)
- Attributes stored per item: `name`, `category`, `prepTime`, `ingredients`, `instructions`, `createdAt` (ISO string), `imageKey` (S3 object key, optional)
- Images are NOT stored in DynamoDB — only the S3 key is stored.

### S3 Buckets
- `recipe-cloud-book-frontend` — static website hosting enabled, public read. Hosts `index.html`, `style.css`, `app.js`.
- `recipe-cloud-book-images` — fully private. Accessed only via pre-signed URLs (upload) and CloudFront OAC (display).

### CloudFront
- Single distribution with two origins:
  - Default origin (`/*`): `recipe-cloud-book-frontend` S3 bucket
  - Images origin (`/images/*`): `recipe-cloud-book-images` S3 bucket via Origin Access Control
- HTTPS only. Custom domain `rcb.proj.rotem.click` with ACM certificate.

### API Gateway
- HTTP API (v2) with CORS enabled for `https://rcb.proj.rotem.click`
- 4 routes, each backed by a dedicated Lambda:

| Method | Route | Lambda |
|---|---|---|
| POST | /recipes | create-recipe |
| GET | /recipes | list-recipes |
| DELETE | /recipes/{id} | delete-recipe |
| GET | /recipes/upload-url | get-upload-url |

### Lambda Functions (Python 3.12)

**create-recipe**
- Input: JSON body `{recipeId, name, category, prepTime, ingredients, instructions, createdAt, imageKey?}` + `x-user-email` header
- Action: `DynamoDB.put_item` with PK=email, SK=recipeId
- Output: `201 {recipeId}`

**list-recipes**
- Input: `x-user-email` header
- Action: `DynamoDB.query` with KeyConditionExpression `email = :email`
- Output: `200 {recipes: [...]}`

**delete-recipe**
- Input: path param `{id}` + `x-user-email` header
- Action: `DynamoDB.delete_item` + `S3.delete_object` if imageKey exists
- Output: `204`

**get-upload-url**
- Input: query param `filename` + `x-user-email` header
- Action: `S3.generate_presigned_url('put_object')` with key `{email}/{recipeId}/{filename}`, TTL 300s
- Output: `200 {uploadUrl, imageKey}`

### Image Upload Flow
1. User selects image file in form.
2. On form submit: frontend calls `GET /recipes/upload-url?filename=photo.jpg` → receives `{uploadUrl, imageKey}`.
3. Frontend PUTs the raw file directly to `uploadUrl` (no Lambda in the middle).
4. Frontend includes `imageKey` in the `POST /recipes` body.
5. On recipe card render: image `src` is `https://rcb.proj.rotem.click/images/{imageKey}` (served via CloudFront).

### Frontend Modules
- **identity module** (`identity.js`): `getEmail()`, `setEmail(email)`, `clearEmail()`, modal show/hide, header badge render.
- **api module** (`api.js`): `createRecipe(data)`, `listRecipes()`, `deleteRecipe(id)`, `getUploadUrl(filename)`, `uploadToS3(url, file)`. All methods attach `x-user-email` header. All methods return parsed JSON or throw on non-2xx.
- **app.js** (modified): Replaces all `localStorage` CRUD with `api` module calls. Adds inline `<div id="statusMessage">` updated by a `setStatus(state, text)` helper. Wires image upload to pre-signed URL flow before recipe POST.

### CI/CD — GitHub Actions

**deploy-backend.yml**
- Trigger: push to `main`, path filter `backend/**`
- Steps: checkout → configure AWS credentials (OIDC) → set up Python 3.12 → zip each Lambda folder → `aws lambda update-function-code` for each of the 4 functions
- Secrets: `AWS_ROLE_TO_ASSUME`, `AWS_REGION`, Lambda function name secrets for each of the 4 functions

**deploy-frontend.yml**
- Trigger: push to `main`, path filter `frontend/**`
- Steps: checkout → configure AWS credentials (OIDC) → `aws s3 sync frontend/ s3://{bucket}` → `aws cloudfront create-invalidation`
- Secrets: `AWS_ROLE_TO_ASSUME`, `AWS_REGION`, `FRONTEND_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`

**quality-gate.yml**
- Trigger: push and pull_request on all branches
- Steps: checkout → Python 3.12 setup → `python -m py_compile` on all Lambda files → Node.js setup → `npx --yes acorn` parse check on `frontend/app.js`

### DNS & Certificate
- Route 53 hosted zone: `rcb.proj.rotem.click`
- ACM certificate: `rcb.proj.rotem.click` (us-east-1, required for CloudFront)
- NS records submitted to course subdomain registry at `subzone.demo.rotem.click` with course code `62957`

### localStorage — Clean Break
- On app initialization, `localStorage.getItem('recipeCloudBookRecipes')` (the old key) is cleared.
- All recipe data comes exclusively from the API after cloud launch.

## Testing Decisions

**What makes a good test here:** Tests should call the Lambda handler function directly with a realistic API Gateway event dict and assert on the HTTP response (status code + body). They should not test boto3 internals — only that the Lambda returns the correct response shape given valid or invalid input. boto3 calls are mocked at the client level.

**Modules under test:** All 4 Lambda functions.

**Test cases per Lambda:**

- `create-recipe`: valid input returns 201 with recipeId; missing required field returns 400; DynamoDB error returns 500.
- `list-recipes`: valid email returns 200 with recipe array; empty result returns 200 with empty array; missing email header returns 400.
- `delete-recipe`: valid id returns 204; non-existent id still returns 204 (idempotent delete); missing email header returns 400.
- `get-upload-url`: valid filename returns 200 with uploadUrl and imageKey; missing filename returns 400.

**Test framework:** `pytest` with `unittest.mock` to patch boto3 clients. One test file per Lambda under `backend/{lambda_name}/test_lambda_function.py`.

## Out of Scope

- Password-based authentication or AWS Cognito
- Recipe editing (update after creation)
- Sharing recipes between users
- Recipe ratings or comments
- Offline mode or localStorage sync
- Server-side search / DynamoDB FilterExpression
- Image resizing or optimization
- Pagination of recipe list
- Infrastructure as Code (Terraform / CloudFormation / SAM)
- Mobile app

## Further Notes

- The course requires a screenshot of CloudWatch logs in the presentation deck. Ensure each Lambda logs the incoming email and recipeId at INFO level on every invocation.
- The course requires a screenshot of the Route 53 / CloudFront / ACM configuration. Set these up early — DNS propagation can take up to 48 hours.
- The Quality Gate workflow doubles as proof of a passing CI run for the presentation slide that requires a GitHub Actions screenshot.
- Team member: Nofar Leibovich (from README). Course code: 62957.
