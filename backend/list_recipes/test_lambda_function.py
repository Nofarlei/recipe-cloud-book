import json
import os
import sys
import importlib.util
from unittest.mock import MagicMock, patch

_MODULE_NAME = "list_recipes_lambda"
_spec = importlib.util.spec_from_file_location(
    _MODULE_NAME, os.path.join(os.path.dirname(__file__), "lambda_function.py")
)
_mod = importlib.util.module_from_spec(_spec)
sys.modules[_MODULE_NAME] = _mod
_spec.loader.exec_module(_mod)
lambda_handler = _mod.lambda_handler


def make_event(email=None):
    return {
        "headers": {"x-user-email": email} if email else {},
        "requestContext": {"http": {"method": "GET"}},
    }


SAMPLE_RECIPES = [
    {
        "recipeId": {"S": "abc-123"},
        "email": {"S": "user@example.com"},
        "name": {"S": "Pancakes"},
        "category": {"S": "Breakfast"},
        "prepTime": {"S": "20 min"},
        "ingredients": {"S": "flour, eggs, milk"},
        "instructions": {"S": "Mix and fry"},
        "createdAt": {"S": "2026-06-03T10:00:00Z"},
    }
]


def test_valid_email_returns_200_with_recipes():
    mock_dynamodb = MagicMock()
    mock_dynamodb.query.return_value = {"Items": SAMPLE_RECIPES}

    with patch(f"{_MODULE_NAME}.boto3.client", return_value=mock_dynamodb):
        response = lambda_handler(make_event(email="user@example.com"), {})

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "recipes" in body
    assert len(body["recipes"]) == 1
    assert body["recipes"][0]["name"] == "Pancakes"


def test_empty_result_returns_200_with_empty_list():
    mock_dynamodb = MagicMock()
    mock_dynamodb.query.return_value = {"Items": []}

    with patch(f"{_MODULE_NAME}.boto3.client", return_value=mock_dynamodb):
        response = lambda_handler(make_event(email="new@example.com"), {})

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["recipes"] == []


def test_missing_email_header_returns_400():
    response = lambda_handler(make_event(email=None), {})
    assert response["statusCode"] == 400
