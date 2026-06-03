import pytest
import sys


@pytest.fixture(autouse=True)
def isolate_lambda_module():
    sys.modules.pop("lambda_function", None)
    yield
    sys.modules.pop("lambda_function", None)
