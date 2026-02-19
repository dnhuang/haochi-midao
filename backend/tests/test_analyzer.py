import io

import pandas as pd
import pytest

from app.analyzer import (
    DeliveryOrderAnalyzer,
    load_food_items,
    process_excel,
    read_summary_table,
    validate_against_summary,
)


def test_load_food_items():
    items = load_food_items()
    assert len(items) == 31
    assert all(isinstance(i, str) for i in items)


def test_load_food_items_missing_file():
    with pytest.raises(FileNotFoundError):
        load_food_items("/nonexistent/menu.csv")


def test_read_summary_table(sample_xlsx_path):
    with open(sample_xlsx_path, "rb") as f:
        summary = read_summary_table(f)
    assert isinstance(summary, dict)
    assert len(summary) > 0
    # Check a known item
    assert summary.get("肉末香茹胡罗卜糯米烧卖15个/份") == 4
    assert summary.get("荠菜鲜肉馄饨50/份") == 3


def test_process_excel_basic(sample_xlsx_path):
    food_items = load_food_items()
    with open(sample_xlsx_path, "rb") as f:
        df, discrepancies = process_excel(f, food_items)

    assert isinstance(df, pd.DataFrame)
    assert len(df) == 4  # 4 orders in fixture
    # Standard columns present
    for col in ["delivery", "customer", "items_ordered", "phone_number", "address", "city", "zip_code"]:
        assert col in df.columns


def test_process_excel_item_parsing(sample_xlsx_path):
    food_items = load_food_items()
    with open(sample_xlsx_path, "rb") as f:
        df, _ = process_excel(f, food_items)

    # Order 1 (index 0): 烧卖 x3, 馄饨 x2
    assert df.at[0, "肉末香茹胡罗卜糯米烧卖15个/份"] == 3
    assert df.at[0, "荠菜鲜肉馄饨50/份"] == 2


def test_process_excel_no_orders():
    """An xlsx with no valid orders should raise ValueError."""
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["meta1"])
    ws.append(["meta2"])
    ws.append(["meta3"])
    ws.append(["序号", "姓名", "内容", "标签", "手机号码", "收货地址", "所在城市", "邮政编码"])
    # No data rows

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    food_items = load_food_items()
    with pytest.raises(ValueError, match="No orders found"):
        process_excel(buf, food_items)


def test_process_excel_discrepancies(sample_xlsx_path):
    food_items = load_food_items()
    with open(sample_xlsx_path, "rb") as f:
        _, discrepancies = process_excel(f, food_items)
    # Our fixture should have matching totals, so no discrepancies
    assert isinstance(discrepancies, list)


def test_validate_against_summary_match():
    df = pd.DataFrame({"item_a": [1, 2], "item_b": [3, 0]})
    food_items = ["item_a", "item_b"]
    summary = {"item_a": 3, "item_b": 3}
    result = validate_against_summary(df, food_items, summary)
    assert result == []


def test_validate_against_summary_mismatch():
    df = pd.DataFrame({"item_a": [1, 2], "item_b": [3, 0]})
    food_items = ["item_a", "item_b"]
    summary = {"item_a": 3, "item_b": 5}  # item_b: parsed=3, expected=5
    result = validate_against_summary(df, food_items, summary)
    assert len(result) == 1
    assert result[0] == ("item_b", 3, 5)


def test_validate_against_summary_skips_absent():
    df = pd.DataFrame({"item_a": [1, 2], "item_b": [0, 0]})
    food_items = ["item_a", "item_b"]
    summary = {"item_a": 3}  # item_b not in summary
    result = validate_against_summary(df, food_items, summary)
    assert result == []


def test_analyzer_load(sample_xlsx_path):
    food_items = load_food_items()
    with open(sample_xlsx_path, "rb") as f:
        df, _ = process_excel(f, food_items)

    analyzer = DeliveryOrderAnalyzer()
    analyzer.load(df)
    assert len(analyzer.food_columns) > 0
    # All food columns should contain Chinese characters
    import re

    for col in analyzer.food_columns:
        assert re.search(r"[\u4e00-\u9fff]", col)


def test_analyzer_analyze_basic(sample_xlsx_path):
    food_items = load_food_items()
    with open(sample_xlsx_path, "rb") as f:
        df, _ = process_excel(f, food_items)

    analyzer = DeliveryOrderAnalyzer()
    analyzer.load(df)
    sorted_items, total = analyzer.analyze([0, 1, 2, 3])
    assert total > 0
    assert len(sorted_items) > 0
    # Items should be sorted descending by quantity
    for i in range(len(sorted_items) - 1):
        assert sorted_items[i][1] >= sorted_items[i + 1][1]


def test_analyzer_analyze_empty():
    analyzer = DeliveryOrderAnalyzer()
    sorted_items, total = analyzer.analyze([])
    assert sorted_items == []
    assert total == 0
