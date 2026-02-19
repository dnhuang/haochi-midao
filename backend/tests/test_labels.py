from pathlib import Path

import pandas as pd

from app.labels import generate_labels_pdf

MENU_CSV = Path(__file__).resolve().parent.parent / "data" / "menu.csv"


def test_generate_labels_pdf_basic():
    menu_df = pd.read_csv(MENU_CSV)
    sorted_items = [("肉末香茹胡罗卜糯米烧卖15个/份", 3), ("荠菜鲜肉馄饨50/份", 2)]
    pdf_bytes = generate_labels_pdf(sorted_items, menu_df)
    assert pdf_bytes[:5] == b"%PDF-"
    assert len(pdf_bytes) > 100


def test_generate_labels_pdf_empty():
    menu_df = pd.read_csv(MENU_CSV)
    pdf_bytes = generate_labels_pdf([], menu_df)
    assert pdf_bytes[:5] == b"%PDF-"


def test_generate_labels_pdf_pagination():
    """More than 80 labels should produce multiple pages."""
    menu_df = pd.read_csv(MENU_CSV)
    # 85 labels of one item -> should need 2 pages
    sorted_items = [("肉末香茹胡罗卜糯米烧卖15个/份", 85)]
    pdf_bytes = generate_labels_pdf(sorted_items, menu_df)
    assert pdf_bytes[:5] == b"%PDF-"
    # Multiple pages should be present
    assert len(pdf_bytes) > 500
