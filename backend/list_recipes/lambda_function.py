import json
import os
import boto3
from boto3.dynamodb.conditions import Key


TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "recipe-cloud-book-recipes")


def lambda_handler(event, context):
    email = (event.get("headers") or {}).get("x-user-email")
    if not email:
        return {"statusCode": 400, "body": json.dumps({"error": "Missing x-user-email header"})}

    client = boto3.client("dynamodb")
    result = client.query(
        TableName=TABLE_NAME,
        KeyConditionExpression="email = :email",
        ExpressionAttributeValues={":email": {"S": email}},
    )

    recipes = []
    for item in result.get("Items", []):
        recipe = {k: list(v.values())[0] for k, v in item.items()}
        recipes.append(recipe)

    print(f"INFO: list_recipes email={email} count={len(recipes)}")
    return {"statusCode": 200, "body": json.dumps({"recipes": recipes})}
