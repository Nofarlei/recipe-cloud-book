import json
import os
import sys
import importlib.util
from unittest.mock import MagicMock, patch

_MODULE_NAME = "delete_recipe_lambda"
_spec = importlib.util.spec_from_file_location(
    _MODULE_NAME, os.path.join(os.path.dirname(__file__), "lambda_function.py")
)
_mod = importlib.util.module_from_spec(_spec)
sys.modules[_MODULE_NAME] = _mod
_spec.loader.exec_module(_mod)
lambda_handler = _mod.lambda_handler


def make_event(email="user@example.com", recipe_id="abc-123"):
    return {
        "headers": {"x-user-email": email} if email else {},
        "pathParameters": {"id": recipe_id},
    }


def test_valid_delete_returns_204():
    mock_dynamodb = MagicMock()
    mock_dynamodb.get_item.return_value = {"Item": {}}
    mock_s3 = MagicMock()

    with patch(f"{_MODULE_NAME}.boto3.client", side_effect=[mock_dynamodb, mock_s3]):
        response = lambda_handler(make_event(), {})

    assert response["statusCode"] == 204
    mock_dynamodb.delete_item.assert_called_once()


def test_nonexistent_recipe_still_returns_204():
    mock_dynamodb = MagicMock()
    mock_dynamodb.get_item.return_value = {}
    mock_s3 = MagicMock()

    with patch(f"{_MODULE_NAME}.boto3.client", side_effect=[mock_dynamodb, mock_s3]):
        response = lambda_handler(make_event(), {})

    assert response["statusCode"] == 204


def test_missing_email_header_returns_400():
    response = lambda_handler(make_event(email=None), {})
    assert response["statusCode"] == 400


def test_recipe_with_image_key_also_deletes_s3_object():
    mock_dynamodb = MagicMock()
    mock_dynamodb.get_item.return_value = {
        "Item": {"imageKey": {"S": "user@example.com/abc-123/photo.jpg"}}
    }
    mock_s3 = MagicMock()

    with patch(f"{_MODULE_NAME}.boto3.client", side_effect=[mock_dynamodb, mock_s3]):
        response = lambda_handler(make_event(), {})

    assert response["statusCode"] == 204
    mock_s3.delete_object.assert_called_once()
