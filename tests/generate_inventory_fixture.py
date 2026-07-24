"""添付CSVからローカル表示確認用の公開JSONを生成する補助スクリプト。"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from datetime import datetime, timezone, timedelta
from pathlib import Path

REQUIRED = {
    "id",
    "item_id",
    "myca_item_id",
    "display_name",
    "condition_option_display_name",
    "sell_price",
    "stock_number",
    "genre_display_name",
    "category_display_name",
    "expansion",
    "cardnumber",
    "rarity",
    "pack_name",
    "upload_error",
}


def decode_csv(raw: bytes) -> tuple[str, str]:
    if raw.startswith(b"\xef\xbb\xbf"):
        return raw.decode("utf-8-sig"), "UTF-8 BOM"
    try:
        return raw.decode("utf-8"), "UTF-8"
    except UnicodeDecodeError:
        return raw.decode("cp932"), "Shift_JIS"


def positive_integer(value: str) -> int | None:
    try:
        number = int(value.strip())
    except ValueError:
        return None
    return number if number > 0 else None


def generate(source: Path, destination: Path) -> dict:
    text, encoding = decode_csv(source.read_bytes())
    rows = [row for row in csv.reader(text.splitlines()) if any(cell.strip() for cell in row)]
    header_index = next(
        index
        for index, row in enumerate(rows)
        if {"id", "sell_price", "stock_number"}.issubset(set(row))
    )
    header = rows[header_index]
    columns = {name.strip(): index for index, name in enumerate(header)}
    missing = REQUIRED - columns.keys()
    if missing:
        raise ValueError(f"必須列不足: {', '.join(sorted(missing))}")
    marker_index = next(
        (
            index
            for index in range(header_index + 1, len(rows))
            if rows[index][0].strip() == "この下の行からデータ開始"
        ),
        header_index,
    )
    data_rows = rows[marker_index + 1 :]
    ids = Counter(
        row[columns["id"]].strip() if len(row) > columns["id"] else ""
        for row in data_rows
    )

    items: list[dict] = []
    excluded = 0
    for row in data_rows:
        get = lambda name: row[columns[name]].strip() if columns[name] < len(row) else ""
        item_id = get("id")
        name = get("display_name")
        stock = positive_integer(get("stock_number"))
        price = positive_integer(get("sell_price"))
        invalid = (
            len(row) != len(header)
            or not item_id
            or ids[item_id] > 1
            or not name
            or bool(get("upload_error"))
            or stock is None
            or price is None
        )
        if invalid:
            excluded += 1
            continue
        items.append(
            {
                "id": item_id,
                "itemId": get("item_id"),
                "mycaItemId": get("myca_item_id"),
                "name": name,
                "condition": get("condition_option_display_name"),
                "price": price,
                "stock": stock,
                "genre": get("genre_display_name"),
                "category": get("category_display_name"),
                "expansion": get("expansion"),
                "cardNumber": get("cardnumber"),
                "rarity": get("rarity"),
                "packName": get("pack_name"),
            }
        )

    now = datetime.now(timezone(timedelta(hours=9))).isoformat(timespec="seconds")
    result = {
        "updatedAt": now,
        "sourceFileName": source.name,
        "totalImportedCount": len(data_rows),
        "publishedCount": len(items),
        "excludedCount": excluded,
        "items": items,
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    return {"encoding": encoding, **{key: result[key] for key in (
        "totalImportedCount", "publishedCount", "excludedCount"
    )}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(json.dumps(generate(args.source, args.destination), ensure_ascii=False))
