from datetime import date

import pytest

from engine.records import load_workspace
from engine.rules import load_ruleset

DEMO_DATE = date(2026, 11, 19)


@pytest.fixture
def tidewell():
    return load_workspace()


@pytest.fixture
def rules_2026():
    return load_ruleset(2026)


@pytest.fixture
def rules_2025():
    return load_ruleset(2025)


@pytest.fixture
def demo_date():
    return DEMO_DATE
