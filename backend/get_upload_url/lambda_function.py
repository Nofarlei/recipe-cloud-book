import json
import os
import uuid
import boto3


IMAGES_BUCKET = os.environ.get("IMAGES_BUCKET", "recipe-cloud-book-images")
PRESIGNED_URL_TTL = 300


def lambda_handler(event, context):
    email = (event.get("headers") or {}).get("x-user-email")
    if not email:
        return {"statusCode": 400, "body": json.dumps({"error": "Missing x-user-email header"})}

    filename = (event.get("queryStringParameters") or {}).get("filename")
    if not filename:
        return {"statusCode": 400, "body": json.dumps({"error": "Missing filename query parameter"})}

    recipe_id = str(uuid.uuid4())
    image_key = f"images/{email}/{recipe_id}/{filename}"

    s3 = boto3.client("s3")
    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": IMAGES_BUCKET, "Key": image_key},
        ExpiresIn=PRESIGNED_URL_TTL,
    )

    print(f"INFO: get_upload_url email={email} imageKey={image_key}")
    return {"statusCode": 200, "body": json.dumps({"uploadUrl": upload_url, "imageKey": image_key})}
