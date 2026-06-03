import json
import os
import sys
import importlib.util
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError

_MODULE_NAME = "create_recipe_lambda"
_spec = importlib.util.spec_from_file_location(
    _MODULE_NAME, os.path.join(os.path.dirname(__file__), "lambda_function.py")
)
_mod = importlib.util.module_from_spec(_spec)
sys.modules[_MODULE_NAME] = _mod
_spec.loader.exec_module(_mod)
lambda_handler = _mod.lambda_handler


VALID_BODY = {
    "recipeId": "abc-123",
    "name": "Pancakes",
    "category": "Breakfast",
    "prepTime": "20 min",
    "ingredients": "flour, eggs, milk",
    "instructions": "Mix and fry",
    "createdAt": "2026-06-03T10:00:00Z",
}


def make_event(email="user@example.com", body=None):
    return {
        "headers": {"x-user-email": email} if email else {},
        "body": json.dumps(body if body is not None else VALID_BODY),
    }


def test_valid_input_returns_201_with_recipe_id():
    mock_dynamodb = MagicMock()

    with patch(f"{_MODULE_NAME}.boto3.client", return_value=mock_dynamodb):
        response = lambda_handler(make_event(), {})

    assert response["statusCode"] == 201
    body = json.loads(response["body"])
    assert body["recipeId"] == "abc-123"
    mock_dynamodb.put_item.assert_called_once()


def test_missing_required_field_returns_400():
    incomplete = {k: v for k, v in VALID_BODY.items() if k != "name"}

    with patch(f"{_MODULE_NAME}.boto3.client", return_value=MagicMock()):
        response = lambda_handler(make_event(body=incomplete), {})

    assert response["statusCode"] == 400


def test_missing_email_header_returns_400():
    with patch(f"{_MODULE_NAME}.boto3.client", return_value=MagicMock()):
        response = lambda_handler(make_event(email=None), {})

    assert response["statusCode"] == 400


def test_dynamodb_error_returns_500():
    mock_dynamodb = MagicMock()
    mock_dynamodb.put_item.side_effect = ClientError(
        {"Error": {"Code": "InternalServerError", "Message": "DynamoDB error"}},
        "PutItem",
    )

    with patch(f"{_MODULE_NAME}.boto3.client", return_value=mock_dynamodb):
        response = lambda_handler(make_event(), {})

    assert response["statusCode"] == 500
