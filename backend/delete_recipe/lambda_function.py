import json
import os
import boto3


TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "recipe-cloud-book-recipes")
IMAGES_BUCKET = os.environ.get("IMAGES_BUCKET", "recipe-cloud-book-images")


def lambda_handler(event, context):
    email = (event.get("headers") or {}).get("x-user-email")
    if not email:
        return {"statusCode": 400, "body": json.dumps({"error": "Missing x-user-email header"})}

    recipe_id = (event.get("pathParameters") or {}).get("id")

    dynamodb = boto3.client("dynamodb")
    s3 = boto3.client("s3")

    existing = dynamodb.get_item(
        TableName=TABLE_NAME,
        Key={"email": {"S": email}, "recipeId": {"S": recipe_id}},
    )

    image_key = None
    if existing.get("Item"):
        image_key = (existing["Item"].get("imageKey") or {}).get("S")

    dynamodb.delete_item(
        TableName=TABLE_NAME,
        Key={"email": {"S": email}, "recipeId": {"S": recipe_id}},
    )

    if image_key:
        s3.delete_object(Bucket=IMAGES_BUCKET, Key=image_key)

    print(f"INFO: delete_recipe email={email} recipeId={recipe_id}")
    return {"statusCode": 204, "body": ""}
