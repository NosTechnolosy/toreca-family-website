use chrono::{FixedOffset, Utc};
use csv::{ReaderBuilder, StringRecord};
use encoding_rs::SHIFT_JIS;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::io::Cursor;
use std::path::Path;

const REQUIRED_COLUMNS: [&str; 4] = ["id", "myca_item_id", "image_url", "upload_error"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductMaster {
    pub updated_at: Option<String>,
    pub source_file_name: String,
    pub total_imported_count: usize,
    pub published_count: usize,
    pub excluded_count: usize,
    pub images_by_myca_item_id: HashMap<String, String>,
    pub images_by_item_id: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductMasterPreview {
    pub item_id: String,
    pub myca_item_id: String,
    pub name: String,
    pub card_number: String,
    pub image_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductMasterAnalysis {
    pub source_file_name: String,
    pub encoding: String,
    pub file_size: usize,
    pub imported_count: usize,
    pub published_count: usize,
    pub missing_image_count: usize,
    pub invalid_image_count: usize,
    pub other_error_count: usize,
    pub public_product_master: ProductMaster,
    pub preview: Vec<ProductMasterPreview>,
}

struct ParsedSource {
    encoding: &'static str,
    text: String,
}

pub fn parse_product_master_file(path: &Path) -> Result<ProductMasterAnalysis, String> {
    let bytes = std::fs::read(path)
        .map_err(|error| format!("商品マスタCSVを読み込めませんでした: {error}"))?;
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("product-master.csv")
        .to_string();
    parse_product_master_bytes(&bytes, file_name)
}

pub fn parse_product_master_bytes(
    bytes: &[u8],
    source_file_name: String,
) -> Result<ProductMasterAnalysis, String> {
    if bytes.is_empty() {
        return Err("商品マスタCSVが空です。".into());
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
                "商品マスタCSVを解析できませんでした（{}行目付近）: {error}",
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
                && row.iter().any(|value| value.trim() == "myca_item_id")
                && row.iter().any(|value| value.trim() == "image_url")
        })
        .ok_or_else(|| "商品マスタのシステム用列名が見つかりません。".to_string())?;
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
        return Err(format!("商品マスタの必須列が不足しています: {}", missing.join(", ")));
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
        return Err("商品マスタに商品データがありません。".into());
    }

    let mut images_by_myca_item_id = HashMap::new();
    let mut images_by_item_id = HashMap::new();
    let mut seen_myca = HashSet::new();
    let mut seen_item = HashSet::new();
    let mut preview = Vec::new();
    let mut missing_image_count = 0;
    let mut invalid_image_count = 0;
    let mut other_error_count = 0;

    for (_, row) in data_rows {
        let value = |name: &str| cell(row, columns.get(name).copied());
        let item_id = value("id");
        let myca_item_id = value("myca_item_id");
        let image_url = value("image_url");
        if image_url.is_empty() {
            missing_image_count += 1;
            continue;
        }
        if !valid_image_url(&image_url) {
            invalid_image_count += 1;
            continue;
        }
        if !value("upload_error").is_empty() || (item_id.is_empty() && myca_item_id.is_empty()) {
            other_error_count += 1;
            continue;
        }
        let duplicate = if !myca_item_id.is_empty() {
            !seen_myca.insert(myca_item_id.clone())
        } else {
            !seen_item.insert(item_id.clone())
        };
        if duplicate {
            other_error_count += 1;
            continue;
        }
        if !myca_item_id.is_empty() {
            images_by_myca_item_id.insert(myca_item_id.clone(), image_url.clone());
        } else {
            images_by_item_id.insert(item_id.clone(), image_url.clone());
        }
        if preview.len() < 20 {
            preview.push(ProductMasterPreview {
                item_id,
                myca_item_id,
                name: value("display_name"),
                card_number: value("cardnumber"),
                image_url,
            });
        }
    }

    let published_count = images_by_myca_item_id.len() + images_by_item_id.len();
    if published_count == 0 {
        return Err("有効なHTTPS画像URLを持つ商品がありません。既存データは更新されません。".into());
    }
    let excluded_count = missing_image_count + invalid_image_count + other_error_count;
    let tokyo = FixedOffset::east_opt(9 * 60 * 60).expect("valid Tokyo offset");
    let product_master = ProductMaster {
        updated_at: Some(Utc::now().with_timezone(&tokyo).to_rfc3339()),
        source_file_name: source_file_name.clone(),
        total_imported_count: data_rows.len(),
        published_count,
        excluded_count,
        images_by_myca_item_id,
        images_by_item_id,
    };
    Ok(ProductMasterAnalysis {
        source_file_name,
        encoding: source.encoding.into(),
        file_size: bytes.len(),
        imported_count: data_rows.len(),
        published_count,
        missing_image_count,
        invalid_image_count,
        other_error_count,
        public_product_master: product_master,
        preview,
    })
}

fn valid_image_url(value: &str) -> bool {
    value.len() <= 2048
        && Url::parse(value)
            .map(|url| {
                url.scheme() == "https"
                    && url.host_str().is_some()
                    && url.username().is_empty()
                    && url.password().is_none()
            })
            .unwrap_or(false)
}

fn cell(row: &StringRecord, index: Option<usize>) -> String {
    index
        .and_then(|index| row.get(index))
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn decode_csv(bytes: &[u8]) -> Result<ParsedSource, String> {
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        let text = std::str::from_utf8(&bytes[3..])
            .map_err(|_| "UTF-8 BOM付きCSVに不正な文字があります。".to_string())?;
        return Ok(ParsedSource { encoding: "UTF-8 BOM", text: text.into() });
    }
    if let Ok(text) = std::str::from_utf8(bytes) {
        if text.contains('\u{FFFD}') {
            return Err("文字化けを検出しました。CSVの文字コードを確認してください。".into());
        }
        return Ok(ParsedSource { encoding: "UTF-8", text: text.into() });
    }
    let (decoded, _, had_errors) = SHIFT_JIS.decode(bytes);
    if had_errors || decoded.contains('\u{FFFD}') {
        return Err("文字化けを検出しました。UTF-8またはShift_JISで保存し直してください。".into());
    }
    Ok(ParsedSource { encoding: "Shift_JIS", text: decoded.into_owned() })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn csv_with(data: &str) -> Vec<u8> {
        format!(
            "商品マスタ用テンプレート,,,,,\n\
             日本語列,,,,,\n\
             ハンドル名,,,,,\n\
             id,myca_item_id,display_name,image_url,cardnumber,upload_error\n\
             この下の行からデータ開始,,,,,\n\
             {data}"
        ).into_bytes()
    }

    #[test]
    fn extracts_only_safe_image_lookups() {
        let bytes = csv_with(
            "1,100,商品A,https://static.example.com/a.jpg,A-001,\n\
             2,200,画像なし,,A-002,\n\
             3,300,不正URL,http://example.com/c.jpg,A-003,\n\
             4,,商品D,https://static.example.com/d.jpg,A-004,"
        );
        let result = parse_product_master_bytes(&bytes, "item.csv".into()).unwrap();
        assert_eq!(result.imported_count, 4);
        assert_eq!(result.published_count, 2);
        assert_eq!(result.missing_image_count, 1);
        assert_eq!(result.invalid_image_count, 1);
        assert_eq!(
            result.public_product_master.images_by_myca_item_id["100"],
            "https://static.example.com/a.jpg"
        );
        assert_eq!(
            result.public_product_master.images_by_item_id["4"],
            "https://static.example.com/d.jpg"
        );
    }

    #[test]
    fn supports_the_supplied_product_master_when_configured() {
        let Ok(path) = std::env::var("TORECA_PRODUCT_MASTER_CSV") else {
            return;
        };
        let result = parse_product_master_file(Path::new(&path)).unwrap();
        assert!(result.published_count > 70_000);
        assert_eq!(
            result.imported_count,
            result.published_count
                + result.missing_image_count
                + result.invalid_image_count
                + result.other_error_count
        );
    }
}
