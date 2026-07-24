use chrono::{FixedOffset, Utc};
use csv::{ReaderBuilder, StringRecord, WriterBuilder};
use encoding_rs::SHIFT_JIS;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::io::Cursor;
use std::path::Path;

const REQUIRED_COLUMNS: [&str; 14] = [
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
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicInventoryItem {
    pub id: String,
    pub item_id: String,
    pub myca_item_id: String,
    pub name: String,
    pub condition: String,
    pub price: i64,
    pub stock: i64,
    pub genre: String,
    pub category: String,
    pub expansion: String,
    pub card_number: String,
    pub rarity: String,
    pub pack_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicInventory {
    pub updated_at: Option<String>,
    pub source_file_name: String,
    pub total_imported_count: usize,
    pub published_count: usize,
    pub excluded_count: usize,
    pub items: Vec<PublicInventoryItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcludedInventoryRow {
    pub line: usize,
    pub id: String,
    pub name: String,
    pub condition: String,
    pub sell_price: String,
    pub stock_number: String,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryAnalysis {
    pub source_file_name: String,
    pub encoding: String,
    pub file_size: usize,
    pub imported_count: usize,
    pub published_count: usize,
    pub stock_excluded_count: usize,
    pub price_excluded_count: usize,
    pub other_error_count: usize,
    pub warning_count: usize,
    pub public_inventory: PublicInventory,
    pub published_preview: Vec<PublicInventoryItem>,
    pub excluded_preview: Vec<ExcludedInventoryRow>,
    pub errors: Vec<ExcludedInventoryRow>,
}

#[derive(Debug)]
struct ParsedSource {
    encoding: &'static str,
    text: String,
}

pub fn parse_inventory_file(path: &Path) -> Result<InventoryAnalysis, String> {
    let bytes = std::fs::read(path)
        .map_err(|error| format!("CSVファイルを読み込めませんでした: {error}"))?;
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("inventory.csv")
        .to_string();
    parse_inventory_bytes(&bytes, file_name)
}

pub fn parse_inventory_bytes(
    bytes: &[u8],
    source_file_name: String,
) -> Result<InventoryAnalysis, String> {
    if bytes.is_empty() {
        return Err("CSVが空です。".into());
    }
    let source = decode_csv(bytes)?;
    let mut reader = ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_reader(Cursor::new(source.text.as_bytes()));

    let mut rows: Vec<(usize, StringRecord)> = Vec::new();
    for record in reader.records() {
        let record = record.map_err(|error| {
            format!(
                "CSVとして解析できませんでした（{}行目付近）: {error}",
                error.position().map(|position| position.line()).unwrap_or(0)
            )
        })?;
        if record.iter().all(|value| value.trim().is_empty()) {
            continue;
        }
        let line = record
            .position()
            .map(|position| position.line() as usize)
            .unwrap_or(rows.len() + 1);
        rows.push((line, record));
    }

    let header_position = rows
        .iter()
        .position(|(_, row)| {
            row.iter().any(|value| value.trim() == "id")
                && row.iter().any(|value| value.trim() == "sell_price")
                && row.iter().any(|value| value.trim() == "stock_number")
        })
        .ok_or_else(|| "システム用列名の行が見つかりません。4行目を確認してください。".to_string())?;

    let header = &rows[header_position].1;
    let columns: HashMap<&str, usize> = header
        .iter()
        .enumerate()
        .map(|(index, value)| (value.trim(), index))
        .collect();
    let missing: Vec<&str> = REQUIRED_COLUMNS
        .iter()
        .copied()
        .filter(|column| !columns.contains_key(column))
        .collect();
    if !missing.is_empty() {
        return Err(format!("必須列が不足しています: {}", missing.join(", ")));
    }

    let data_start = rows
        .iter()
        .enumerate()
        .skip(header_position + 1)
        .find(|(_, (_, row))| {
            row.get(0)
                .map(|value| value.trim() == "この下の行からデータ開始")
                .unwrap_or(false)
        })
        .map(|(position, _)| position + 1)
        .unwrap_or(header_position + 1);
    let data_rows = &rows[data_start..];
    if data_rows.is_empty() {
        return Err("CSVに在庫データがありません。".into());
    }

    let id_index = columns["id"];
    let mut id_counts: HashMap<String, usize> = HashMap::new();
    for (_, row) in data_rows {
        let id = cell(row, id_index);
        if !id.is_empty() {
            *id_counts.entry(id).or_default() += 1;
        }
    }

    let mut published = Vec::new();
    let mut excluded = Vec::new();
    let mut stock_excluded_count = 0;
    let mut price_excluded_count = 0;
    let mut other_error_count = 0;
    let mut warning_rows: HashSet<usize> = HashSet::new();

    for (line, row) in data_rows {
        let value = |name: &str| cell(row, columns[name]);
        let id = value("id");
        let name = value("display_name");
        let condition = value("condition_option_display_name");
        let sell_price = value("sell_price");
        let stock_number = value("stock_number");
        let mut reasons = Vec::new();
        let mut structural_error = false;

        if row.len() != header.len() {
            reasons.push(format!(
                "列数が不正です（{}列、正しくは{}列）",
                row.len(),
                header.len()
            ));
            structural_error = true;
        }
        if id.is_empty() {
            reasons.push("在庫IDがありません".into());
            structural_error = true;
        } else if id_counts.get(&id).copied().unwrap_or(0) > 1 {
            reasons.push("CSV内で在庫IDが重複しています".into());
            structural_error = true;
        }
        if name.is_empty() {
            reasons.push("商品名がありません".into());
            structural_error = true;
        }
        if !value("upload_error").is_empty() {
            reasons.push("アップロードエラーが設定されています".into());
            structural_error = true;
        }

        let stock = parse_positive_integer(&stock_number);
        if stock.is_err() {
            reasons.push(number_reason("在庫数", &stock_number));
        }
        let price = parse_positive_integer(&sell_price);
        if price.is_err() {
            reasons.push(number_reason("販売価格", &sell_price));
        }

        if reasons.is_empty() {
            let item = PublicInventoryItem {
                id,
                item_id: value("item_id"),
                myca_item_id: value("myca_item_id"),
                name,
                condition,
                price: price.expect("validated price"),
                stock: stock.expect("validated stock"),
                genre: value("genre_display_name"),
                category: value("category_display_name"),
                expansion: value("expansion"),
                card_number: value("cardnumber"),
                rarity: value("rarity"),
                pack_name: value("pack_name"),
            };
            if item.genre.is_empty() || item.category.is_empty() {
                warning_rows.insert(*line);
            }
            published.push(item);
        } else {
            if structural_error {
                other_error_count += 1;
            } else if stock.is_err() {
                stock_excluded_count += 1;
            } else {
                price_excluded_count += 1;
            }
            excluded.push(ExcludedInventoryRow {
                line: *line,
                id,
                name,
                condition,
                sell_price,
                stock_number,
                reasons,
            });
        }
    }

    if published.is_empty() {
        return Err(
            "公開条件（在庫数1以上・販売価格1円以上）を満たす商品がありません。既存データは更新されません。"
                .into(),
        );
    }

    let tokyo = FixedOffset::east_opt(9 * 60 * 60).expect("valid Tokyo offset");
    let updated_at = Utc::now().with_timezone(&tokyo).to_rfc3339();
    let public_inventory = PublicInventory {
        updated_at: Some(updated_at),
        source_file_name: source_file_name.clone(),
        total_imported_count: data_rows.len(),
        published_count: published.len(),
        excluded_count: excluded.len(),
        items: published.clone(),
    };

    Ok(InventoryAnalysis {
        source_file_name,
        encoding: source.encoding.into(),
        file_size: bytes.len(),
        imported_count: data_rows.len(),
        published_count: published.len(),
        stock_excluded_count,
        price_excluded_count,
        other_error_count,
        warning_count: warning_rows.len(),
        published_preview: published.iter().take(20).cloned().collect(),
        excluded_preview: excluded.iter().take(20).cloned().collect(),
        errors: excluded,
        public_inventory,
    })
}

pub fn write_error_csv(path: &Path, rows: &[ExcludedInventoryRow]) -> Result<(), String> {
    let mut bytes = vec![0xEF, 0xBB, 0xBF];
    {
        let mut writer = WriterBuilder::new().from_writer(&mut bytes);
        writer
            .write_record([
                "CSV行",
                "在庫ID",
                "商品名",
                "状態",
                "販売価格",
                "在庫数",
                "除外理由",
            ])
            .map_err(|error| format!("エラーCSVを作成できませんでした: {error}"))?;
        for row in rows {
            writer
                .write_record([
                    row.line.to_string(),
                    row.id.clone(),
                    row.name.clone(),
                    row.condition.clone(),
                    row.sell_price.clone(),
                    row.stock_number.clone(),
                    row.reasons.join("／"),
                ])
                .map_err(|error| format!("エラーCSVを作成できませんでした: {error}"))?;
        }
        writer
            .flush()
            .map_err(|error| format!("エラーCSVを保存できませんでした: {error}"))?;
    }
    std::fs::write(path, bytes)
        .map_err(|error| format!("エラーCSVを保存できませんでした: {error}"))
}

fn decode_csv(bytes: &[u8]) -> Result<ParsedSource, String> {
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        let text = std::str::from_utf8(&bytes[3..])
            .map_err(|_| "UTF-8 BOM付きCSVに不正な文字があります。".to_string())?;
        return Ok(ParsedSource {
            encoding: "UTF-8 BOM",
            text: text.into(),
        });
    }
    if let Ok(text) = std::str::from_utf8(bytes) {
        if text.contains('\u{FFFD}') {
            return Err("文字化けを検出しました。CSVの文字コードを確認してください。".into());
        }
        return Ok(ParsedSource {
            encoding: "UTF-8",
            text: text.into(),
        });
    }
    let (decoded, _, had_errors) = SHIFT_JIS.decode(bytes);
    if had_errors || decoded.contains('\u{FFFD}') {
        return Err(
            "文字化けを検出しました。UTF-8またはShift_JISでCSVを保存し直してください。"
                .into(),
        );
    }
    Ok(ParsedSource {
        encoding: "Shift_JIS",
        text: decoded.into_owned(),
    })
}

fn cell(row: &StringRecord, index: usize) -> String {
    row.get(index).unwrap_or_default().trim().to_string()
}

fn parse_positive_integer(value: &str) -> Result<i64, ()> {
    value
        .trim()
        .parse::<i64>()
        .map_err(|_| ())
        .and_then(|number| if number > 0 { Ok(number) } else { Err(()) })
}

fn number_reason(label: &str, value: &str) -> String {
    if value.trim().is_empty() {
        return format!("{label}が入力されていません");
    }
    match value.trim().parse::<i64>() {
        Ok(0) => {
            if label == "販売価格" {
                "販売価格が0円です".into()
            } else {
                "在庫数が0です".into()
            }
        }
        Ok(number) if number < 0 => format!("{label}がマイナスです"),
        _ => format!("{label}が数値ではありません"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn csv_with(data: &str) -> Vec<u8> {
        format!(
            "在庫用テンプレート,,,,,,,,,,,,,\n\
             日本語列,,,,,,,,,,,,,\n\
             ハンドル名,,,,,,,,,,,,,\n\
             id,item_id,myca_item_id,display_name,condition_option_display_name,sell_price,stock_number,genre_display_name,category_display_name,expansion,cardnumber,rarity,pack_name,upload_error\n\
             この下の行からデータ開始,,,,,,,,,,,,,\n\
             {data}"
        )
        .into_bytes()
    }

    #[test]
    fn publishes_only_positive_stock_and_sell_price() {
        let bytes = csv_with(
            "1,10,100,公開商品,状態A,1200,1,ポケモン,カード,SV,001,SR,パック,\n\
             2,20,200,価格ゼロ,状態A,0,1,ポケモン,カード,SV,002,R,パック,\n\
             3,30,300,在庫ゼロ,状態A,500,0,ポケモン,カード,SV,003,R,パック,",
        );
        let analysis = parse_inventory_bytes(&bytes, "test.csv".into()).unwrap();
        assert_eq!(analysis.published_count, 1);
        assert_eq!(analysis.price_excluded_count, 1);
        assert_eq!(analysis.stock_excluded_count, 1);
        assert_eq!(analysis.public_inventory.items[0].price, 1200);
    }

    #[test]
    fn never_uses_specific_sell_price() {
        let text = "在庫用テンプレート,,,,,,,,,,,,,,\n\
                    日本語列,,,,,,,,,,,,,,\n\
                    ハンドル名,,,,,,,,,,,,,,\n\
                    id,item_id,myca_item_id,display_name,condition_option_display_name,specific_sell_price,sell_price,stock_number,genre_display_name,category_display_name,expansion,cardnumber,rarity,pack_name,upload_error\n\
                    この下の行からデータ開始,,,,,,,,,,,,,,\n\
                    1,10,100,公開禁止,状態A,9999,0,1,ポケモン,カード,SV,001,SR,パック,\n\
                    2,20,200,公開商品,状態A,,100,1,ポケモン,カード,SV,002,R,パック,";
        let analysis = parse_inventory_bytes(text.as_bytes(), "test.csv".into()).unwrap();
        assert_eq!(analysis.published_count, 1);
        assert_eq!(analysis.public_inventory.items[0].id, "2");
    }

    #[test]
    fn rejects_duplicate_ids_and_upload_errors() {
        let bytes = csv_with(
            "1,10,100,重複A,状態A,100,1,ポケモン,カード,SV,001,SR,パック,\n\
             1,11,101,重複B,状態A,100,1,ポケモン,カード,SV,002,SR,パック,\n\
             2,20,200,エラー商品,状態A,100,1,ポケモン,カード,SV,003,R,パック,登録エラー\n\
             3,30,300,公開商品,状態A,100,1,ポケモン,カード,SV,004,R,パック,",
        );
        let analysis = parse_inventory_bytes(&bytes, "test.csv".into()).unwrap();
        assert_eq!(analysis.published_count, 1);
        assert_eq!(analysis.other_error_count, 3);
    }

    #[test]
    fn supports_utf8_bom_and_shift_jis() {
        let utf8 = csv_with("1,10,100,商品,状態A,100,1,ポケモン,カード,SV,001,SR,パック,");
        let mut bom = vec![0xEF, 0xBB, 0xBF];
        bom.extend(&utf8);
        assert_eq!(
            parse_inventory_bytes(&bom, "bom.csv".into())
                .unwrap()
                .encoding,
            "UTF-8 BOM"
        );
        let text = String::from_utf8(utf8).unwrap();
        let (encoded, _, _) = SHIFT_JIS.encode(&text);
        assert_eq!(
            parse_inventory_bytes(&encoded, "sjis.csv".into())
                .unwrap()
                .encoding,
            "Shift_JIS"
        );
    }

    #[test]
    fn rejects_empty_and_missing_required_columns() {
        assert!(parse_inventory_bytes(&[], "empty.csv".into()).is_err());
        assert!(parse_inventory_bytes(b"id,name\n1,test", "bad.csv".into()).is_err());
    }

    #[test]
    fn supports_quoted_commas_and_newlines() {
        let bytes = csv_with(
            "1,10,100,\"商品名,カンマ\n改行\",状態A,100,1,ポケモン,カード,SV,001,SR,\"パック,特別\",",
        );
        let analysis = parse_inventory_bytes(&bytes, "quoted.csv".into()).unwrap();
        assert_eq!(analysis.published_count, 1);
        assert!(analysis.public_inventory.items[0].name.contains('\n'));
        assert_eq!(analysis.public_inventory.items[0].pack_name, "パック,特別");
    }

    #[test]
    fn rejects_all_invalid_number_variants() {
        let bytes = csv_with(
            "1,10,100,価格空欄,状態A,,1,ポケモン,カード,SV,001,R,パック,\n\
             2,20,200,価格文字,状態A,abc,1,ポケモン,カード,SV,002,R,パック,\n\
             3,30,300,価格負数,状態A,-1,1,ポケモン,カード,SV,003,R,パック,\n\
             4,40,400,在庫空欄,状態A,100,,ポケモン,カード,SV,004,R,パック,\n\
             5,50,500,在庫文字,状態A,100,abc,ポケモン,カード,SV,005,R,パック,\n\
             6,60,600,在庫負数,状態A,100,-1,ポケモン,カード,SV,006,R,パック,\n\
             7,70,700,正常,状態A,100,1,ポケモン,カード,SV,007,R,パック,",
        );
        let analysis = parse_inventory_bytes(&bytes, "invalid.csv".into()).unwrap();
        assert_eq!(analysis.published_count, 1);
        assert_eq!(analysis.price_excluded_count, 3);
        assert_eq!(analysis.stock_excluded_count, 3);
    }

    #[test]
    fn handles_large_csv_without_changing_rules() {
        let mut data = String::new();
        for index in 1..=10_000 {
            data.push_str(&format!(
                "{index},10,100,商品{index},状態A,100,1,ポケモン,カード,SV,{index},R,パック,\n"
            ));
        }
        let bytes = csv_with(&data);
        let analysis = parse_inventory_bytes(&bytes, "large.csv".into()).unwrap();
        assert_eq!(analysis.published_count, 10_000);
        assert_eq!(analysis.errors.len(), 0);
    }

    #[test]
    fn parses_external_regression_csv_when_configured() {
        let Ok(path) = std::env::var("TORECA_TEST_CSV") else {
            return;
        };
        let analysis = parse_inventory_file(Path::new(&path)).unwrap();
        assert_eq!(
            analysis.imported_count,
            analysis.published_count + analysis.errors.len()
        );
        assert!(analysis
            .public_inventory
            .items
            .iter()
            .all(|item| item.stock > 0 && item.price > 0));
        println!(
            "external_csv imported={} published={} excluded={} stock_excluded={} price_excluded={} other_errors={}",
            analysis.imported_count,
            analysis.published_count,
            analysis.errors.len(),
            analysis.stock_excluded_count,
            analysis.price_excluded_count,
            analysis.other_error_count
        );
    }
}
