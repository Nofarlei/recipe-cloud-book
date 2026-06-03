import json
import os
import boto3
from botocore.exceptions import ClientError


TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "recipe-cloud-book-recipes")
REQUIRED_FIELDS = ["recipeId", "name", "category", "prepTime", "ingredients", "instructions", "createdAt"]


def lambda_handler(event, context):
    email = (event.get("headers") or {}).get("x-user-email")
    if not email:
        return {"statusCode": 400, "body": json.dumps({"error": "Missing x-user-email header"})}

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON body"})}

    for field in REQUIRED_FIELDS:
        if not body.get(field):
            return {"statusCode": 400, "body": json.dumps({"error": f"Missing required field: {field}"})}

    item = {
        "email": {"S": email},
        "recipeId": {"S": body["recipeId"]},
        "name": {"S": body["name"]},
        "category": {"S": body["category"]},
        "prepTime": {"S": body["prepTime"]},
        "ingredients": {"S": body["ingredients"]},
        "instructions": {"S": body["instructions"]},
        "createdAt": {"S": body["createdAt"]},
    }
    if body.get("imageKey"):
        item["imageKey"] = {"S": body["imageKey"]}

    try:
        client = boto3.client("dynamodb")
        client.put_item(TableName=TABLE_NAME, Item=item)
    except ClientError as e:
        print(f"ERROR: create_recipe DynamoDB error: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": "Failed to save recipe"})}

    print(f"INFO: create_recipe email={email} recipeId={body['recipeId']}")
    return {"statusCode": 201, "body": json.dumps({"recipeId": body["recipeId"]})}
