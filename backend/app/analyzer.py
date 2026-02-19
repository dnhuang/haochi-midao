import re
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd


def load_food_items(path: str | None = None) -> List[str]:
    """Load food items from CSV. Raises on failure."""
    if path is None:
        path = str(Path(__file__).resolve().parent.parent / "data" / "menu.csv")
    food_df = pd.read_csv(path)
    return food_df["item_zh"].tolist()


def detect_format(excel_file) -> str:
    """Detect whether the Excel file is raw WeChat export or human-formatted.
    Returns 'raw' or 'formatted'.
    """
    df_header = pd.read_excel(excel_file, skiprows=3, nrows=0)
    excel_file.seek(0)
    return "raw" if "标签" in df_header.columns else "formatted"


def read_summary_table(excel_file, fmt: str = "raw") -> Dict[str, int]:
    """Read the 商品汇总 summary table from a WeChat export Excel file.
    Returns {item_name: total_quantity}.
    """
    if fmt == "raw":
        return _read_summary_raw(excel_file)
    return _read_summary_formatted(excel_file)


def _read_summary_raw(excel_file) -> Dict[str, int]:
    """Read summary table from raw WeChat export format."""
    df_raw = pd.read_excel(excel_file, skiprows=3, header=0)

    # Locate the summary table header row (序号 == '商品')
    header_mask = df_raw["序号"].astype(str).str.strip() == "商品"
    if not header_mask.any():
        return {}

    header_idx = int(header_mask.idxmax())
    summary_df = df_raw.iloc[header_idx + 1 :].copy()

    # Stop at the 总计 row
    total_mask = summary_df["序号"].astype(str).str.strip() == "总计"
    if total_mask.any():
        total_idx = int(total_mask.idxmax())
        summary_df = summary_df.loc[: total_idx - 1]

    summary_df = summary_df.dropna(subset=["序号", "内容"])

    result = {}
    for _, row in summary_df.iterrows():
        item_name = str(row["序号"]).strip()
        try:
            result[item_name] = int(row["内容"])
        except (ValueError, TypeError):
            continue
    return result


def _read_summary_formatted(excel_file) -> Dict[str, int]:
    """Read summary table from human-formatted export."""
    df_raw = pd.read_excel(excel_file, skiprows=3, header=0)

    # Find the row containing '商品汇总' in any cell
    summary_start = None
    for col in df_raw.columns:
        mask = df_raw[col].astype(str).str.strip() == "商品汇总"
        if mask.any():
            summary_start = int(mask.idxmax())
            break

    if summary_start is None:
        return {}

    # Next row has sub-headers: find '商品' and '数量' columns
    header_row = df_raw.iloc[summary_start + 1]
    item_col = None
    qty_col = None
    for c in df_raw.columns:
        val = str(header_row[c]).strip()
        if val == "商品":
            item_col = c
        elif val == "数量":
            qty_col = c

    if item_col is None or qty_col is None:
        return {}

    # Read item/quantity pairs until 总计 or NaN
    result = {}
    for i in range(summary_start + 2, len(df_raw)):
        item = df_raw.iloc[i][item_col]
        qty = df_raw.iloc[i][qty_col]
        if pd.isna(item):
            break
        item_name = str(item).strip()
        if item_name == "总计":
            break
        try:
            result[item_name] = int(qty)
        except (ValueError, TypeError):
            continue
    return result


def validate_against_summary(
    df: pd.DataFrame,
    food_items: List[str],
    summary_dict: Dict[str, int],
) -> List[Tuple[str, int, int]]:
    """Compare parsed item totals against the summary table.
    Returns list of (food_item, parsed_total, expected_total) for any mismatches.
    Items not present in the summary table are skipped.
    """

    def normalize(name: str) -> str:
        return re.sub(r"\s+", "", name)

    normalized_summary = {normalize(k): v for k, v in summary_dict.items()}

    discrepancies = []
    for food_item in food_items:
        parsed_total = int(df[food_item].sum())
        expected = summary_dict.get(food_item) or normalized_summary.get(normalize(food_item))

        if expected is None:
            continue  # Item not ordered this batch — skip

        if parsed_total != expected:
            discrepancies.append((food_item, parsed_total, expected))

    return discrepancies


def process_excel(excel_file, food_items: List[str]) -> Tuple[pd.DataFrame, List[Tuple[str, int, int]]]:
    """
    Process an uploaded Excel file into a DataFrame with food item quantity columns.
    Auto-detects raw WeChat export vs human-formatted files.
    Returns (df, discrepancies) where discrepancies is a list of
    (food_item, parsed_total, expected_total) for any summary table mismatches.
    Raises ValueError on bad input structure.
    """
    fmt = detect_format(excel_file)

    summary_dict = read_summary_table(excel_file, fmt)
    excel_file.seek(0)

    if fmt == "raw":
        df = pd.read_excel(excel_file, skiprows=3, usecols=[0, 1, 2, 4, 5, 6, 7])
    else:
        df = pd.read_excel(excel_file, skiprows=3, usecols=[1, 2, 3, 4, 5, 6, 7])

    df = df.dropna(how="all")

    if len(df.columns) < 7:
        raise ValueError(f"Expected at least 7 columns, got {len(df.columns)}")

    # Map Chinese column names to internal names
    col_map = {
        "序号": "delivery",
        "姓名": "customer",
        "内容": "items_ordered",
        "手机号码": "phone_number",
        "收货地址": "address",
        "所在城市": "city",
        "邮政编码": "zip_code",
        "邮编": "zip_code",
    }
    df = df.rename(columns={c: col_map[c] for c in df.columns if c in col_map})

    # Filter to actual order rows: must have customer AND items text containing 总价
    df = df.dropna(subset=["customer"]).reset_index(drop=True)
    has_order_text = df["items_ordered"].astype(str).str.contains("总价", na=False)
    df = df[has_order_text].reset_index(drop=True)

    # Keep delivery as string
    df["delivery"] = df["delivery"].apply(lambda x: str(int(x)) if isinstance(x, float) and x == int(x) else str(x))

    def _to_str(x):
        if pd.isna(x):
            return ""
        if isinstance(x, float) and x == int(x):
            return str(int(x))
        return str(x)

    df["phone_number"] = df["phone_number"].apply(_to_str)
    df["zip_code"] = df["zip_code"].apply(_to_str)

    if len(df) == 0:
        raise ValueError("No orders found. Make sure you're uploading a valid WeChat export .xlsx file.")

    for food_item in food_items:
        df[food_item] = 0

    for idx, row in df.iterrows():
        items_text = str(row["items_ordered"])
        if items_text == "nan":
            continue

        items_list = items_text.split("， ")
        if len(items_list) > 1:
            items_list = items_list[:-1]

        for item_entry in items_list:
            item_entry = item_entry.strip()
            if not item_entry or "x" not in item_entry:
                continue

            parts = item_entry.rsplit("x", 1)
            if len(parts) != 2:
                continue

            item_name_part = parts[0].strip()
            quantity_match = re.match(r"(\d+)", parts[1].strip())
            if not quantity_match:
                continue

            quantity = int(quantity_match.group(1))

            for food_item in food_items:
                base_name = re.sub(r"\d+个?[/／]?份?$", "", food_item).strip()
                item_name_norm = item_name_part.replace(" ", "")
                base_name_norm = base_name.replace(" ", "")

                if (
                    base_name in item_name_part
                    or item_name_part in base_name
                    or base_name_norm in item_name_norm
                    or item_name_norm in base_name_norm
                ):
                    df.at[idx, food_item] = quantity
                    break

    discrepancies = validate_against_summary(df, food_items, summary_dict)
    return df, discrepancies


class DeliveryOrderAnalyzer:
    def __init__(self):
        self.df = None
        self.food_columns: List[str] = []

    def load(self, df: pd.DataFrame) -> None:
        """Load data from a processed DataFrame."""
        self.df = df
        self.food_columns = [col for col in df.columns[7:] if re.search(r"[\u4e00-\u9fff]", col)]

    def analyze(self, selected_indices: List[int]) -> Tuple[List[Tuple[str, int]], int]:
        """Return (sorted item totals, grand total) for selected order indices."""
        if not selected_indices or self.df is None:
            return [], 0

        selected_df = self.df.iloc[selected_indices]
        item_totals = {col: int(selected_df[col].sum()) for col in self.food_columns if selected_df[col].sum() > 0}
        sorted_items = sorted(item_totals.items(), key=lambda x: x[1], reverse=True)
        return sorted_items, sum(item_totals.values())
