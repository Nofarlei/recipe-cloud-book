---
name: deploy-lambda
description: Zip and deploy one or all Lambda functions to AWS. Pass a function name (create_recipe, list_recipes, delete_recipe, get_upload_url) or "all" to deploy everything. Requires AWS CLI configured with appropriate credentials/profile.
disable-model-invocation: true
---

Deploy Lambda function(s) to AWS.

## Arguments

`$ARGUMENTS` — the Lambda function name to deploy, or `all` to deploy all four.

Valid names: `create_recipe`, `list_recipes`, `delete_recipe`, `get_upload_url`

## Steps

1. Confirm which function(s) to deploy based on $ARGUMENTS.

2. For each target function, from the project root:

```bash
# Zip the Lambda
cd backend/<function_name>
zip -r /tmp/<function_name>.zip lambda_function.py
cd -

# Deploy to AWS
aws lambda update-function-code \
  --function-name recipe-cloud-book-<function_name> \
  --zip-file fileb:///tmp/<function_name>.zip
```

Use the function name with dashes for the AWS Lambda name (e.g. `recipe-cloud-book-create-recipe`).

3. Wait for the update to complete:
```bash
aws lambda wait function-updated --function-name recipe-cloud-book-<function_name>
```

4. Report success or failure for each function.

## Notes

- Do not include test files or `__pycache__` in the zip.
- If no AWS credentials are configured, tell the user to run `aws configure` or set `AWS_PROFILE`.
- The Lambda names in AWS follow the pattern `recipe-cloud-book-<function-name-with-dashes>`.
