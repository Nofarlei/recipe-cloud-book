import json
import os
import sys
import importlib.util
from unittest.mock import MagicMock, patch

_MODULE_NAME = "get_upload_url_lambda"
_spec = importlib.util.spec_from_file_location(
    _MODULE_NAME, os.path.join(os.path.dirname(__file__), "lambda_function.py")
)
_mod = importlib.util.module_from_spec(_spec)
sys.modules[_MODULE_NAME] = _mod
_spec.loader.exec_module(_mod)
lambda_handler = _mod.lambda_handler


def make_event(email="user@example.com", filename="photo.jpg"):
    return {
        "headers": {"x-user-email": email} if email else {},
        "queryStringParameters": {"filename": filename} if filename else {},
    }


def test_valid_request_returns_200_with_upload_url_and_image_key():
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/presigned-url"

    with patch(f"{_MODULE_NAME}.boto3.client", return_value=mock_s3):
        response = lambda_handler(make_event(), {})

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "uploadUrl" in body
    assert "imageKey" in body
    assert body["uploadUrl"] == "https://s3.amazonaws.com/presigned-url"
    assert "photo.jpg" in body["imageKey"]
    assert "user@example.com" in body["imageKey"]


def test_missing_filename_returns_400():
    with patch(f"{_MODULE_NAME}.boto3.client", return_value=MagicMock()):
        response = lambda_handler(make_event(filename=None), {})

    assert response["statusCode"] == 400


def test_missing_email_header_returns_400():
    with patch(f"{_MODULE_NAME}.boto3.client", return_value=MagicMock()):
        response = lambda_handler(make_event(email=None), {})

    assert response["statusCode"] == 400
