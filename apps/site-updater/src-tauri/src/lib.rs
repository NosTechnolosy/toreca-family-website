mod inventory;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use inventory::{
    parse_inventory_file, write_error_csv, ExcludedInventoryRow, InventoryAnalysis,
    PublicInventory,
};
use keyring::Entry;
use reqwest::{header, Client, StatusCode};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::{AppHandle, Manager};

const KEYRING_SERVICE: &str = "jp.toreca-family.site-updater";
const KEYRING_USER: &str = "update-api-key";
const CONFIG_FILE: &str = "connection.json";
const MAX_IMAGE_BYTES: u64 = 8 * 1024 * 1024;
const IMAGE_WARNING_BYTES: u64 = 5 * 1024 * 1024;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionFile {
    api_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionStatus {
    configured: bool,
    api_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ImageInfo {
    path: String,
    file_name: String,
    mime_type: String,
    width: u32,
    height: u32,
    file_size: u64,
    warning: Option<String>,
    preview_data_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateResult {
    message: String,
    updated_at: String,
    published_count: Option<usize>,
    excluded_count: Option<usize>,
    display_date: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BuybackUpdateRequest {
    file_name: String,
    mime_type: String,
    image_base64: String,
    display_date: String,
    alt: String,
}

#[derive(Debug, Deserialize)]
struct ApiError {
    error: Option<String>,
}

#[tauri::command]
async fn parse_inventory_csv(path: String) -> Result<InventoryAnalysis, String> {
    tauri::async_runtime::spawn_blocking(move || parse_inventory_file(Path::new(&path)))
        .await
        .map_err(|_| "CSV解析処理を完了できませんでした。".to_string())?
}

#[tauri::command]
async fn export_inventory_errors(
    path: String,
    errors: Vec<ExcludedInventoryRow>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || write_error_csv(Path::new(&path), &errors))
        .await
        .map_err(|_| "エラーCSVの保存処理を完了できませんでした。".to_string())?
}

#[tauri::command]
fn inspect_buyback_image(path: String) -> Result<ImageInfo, String> {
    let file_path = Path::new(&path);
    let metadata =
        std::fs::metadata(file_path).map_err(|_| "画像ファイルを読み込めませんでした。".to_string())?;
    if metadata.len() > MAX_IMAGE_BYTES {
        return Err("画像の容量が8MBを超えています。容量を小さくしてから選び直してください。".into());
    }
    let bytes =
        std::fs::read(file_path).map_err(|_| "画像ファイルを読み込めませんでした。".to_string())?;
    let format = image::guess_format(&bytes)
        .map_err(|_| "対応していない画像形式です。JPG、PNG、WebPを選んでください。".to_string())?;
    let (mime_type, expected_extensions): (&str, &[&str]) = match format {
        image::ImageFormat::Jpeg => ("image/jpeg", &["jpg", "jpeg"]),
        image::ImageFormat::Png => ("image/png", &["png"]),
        image::ImageFormat::WebP => ("image/webp", &["webp"]),
        _ => {
            return Err(
                "対応していない画像形式です。JPG、PNG、WebPを選んでください。".into(),
            )
        }
    };
    let extension = file_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !expected_extensions.contains(&extension.as_str()) {
        return Err("画像の内容と拡張子が一致しません。正しい形式で保存し直してください。".into());
    }
    let (width, height) =
        image::image_dimensions(file_path).map_err(|_| "画像サイズを確認できませんでした。".to_string())?;
    if width < 300 || height < 300 {
        return Err("画像が小さすぎます。縦横300px以上の画像を選んでください。".into());
    }
    let file_name = file_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("buyback")
        .to_string();
    Ok(ImageInfo {
        path,
        file_name,
        mime_type: mime_type.into(),
        width,
        height,
        file_size: metadata.len(),
        warning: (metadata.len() > IMAGE_WARNING_BYTES).then(|| {
            "画像容量が大きいため、送信や公開に時間がかかる場合があります。".into()
        }),
        preview_data_url: format!("data:{mime_type};base64,{}", BASE64.encode(&bytes)),
    })
}

#[tauri::command]
fn connection_status(app: AppHandle) -> ConnectionStatus {
    let api_url = read_api_url(&app).unwrap_or_default();
    let configured = !api_url.is_empty()
        && keyring_entry()
            .and_then(|entry| entry.get_password())
            .map(|value| !value.is_empty())
            .unwrap_or(false);
    ConnectionStatus {
        configured,
        api_url,
    }
}

#[tauri::command]
fn save_connection(app: AppHandle, api_url: String, api_key: String) -> Result<(), String> {
    let normalized = api_url.trim().trim_end_matches('/').to_string();
    let allowed = normalized.starts_with("https://")
        || normalized.starts_with("http://127.0.0.1:")
        || normalized.starts_with("http://localhost:");
    if !allowed {
        return Err("接続先はhttps://で始まるアドレスを入力してください。".into());
    }
    if api_key.trim().len() < 20 {
        return Err("接続キーが短すぎます。管理者から案内されたキーを入力してください。".into());
    }
    keyring_entry()
        .and_then(|entry| entry.set_password(api_key.trim()))
        .map_err(|_| "接続キーをWindowsへ安全に保存できませんでした。".to_string())?;
    let config_path = connection_config_path(&app)?;
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|_| "接続設定の保存先を作成できませんでした。".to_string())?;
    }
    let json = serde_json::to_vec_pretty(&ConnectionFile {
        api_url: normalized,
    })
    .map_err(|_| "接続設定を作成できませんでした。".to_string())?;
    std::fs::write(config_path, json)
        .map_err(|_| "接続設定を保存できませんでした。".to_string())
}

#[tauri::command]
async fn update_inventory(
    app: AppHandle,
    inventory: PublicInventory,
) -> Result<UpdateResult, String> {
    if inventory.items.is_empty()
        || inventory.published_count != inventory.items.len()
        || inventory
            .items
            .iter()
            .any(|item| item.stock <= 0 || item.price <= 0 || item.id.is_empty() || item.name.is_empty())
    {
        return Err("公開条件を満たさないデータが含まれています。CSVを読み込み直してください。".into());
    }
    let (api_url, api_key) = load_connection(&app)?;
    post_json(
        &format!("{api_url}/api/inventory/update"),
        &api_key,
        &inventory,
        Duration::from_secs(60),
    )
    .await
}

#[tauri::command]
async fn update_buyback(
    app: AppHandle,
    path: String,
    display_date: String,
    alt: String,
) -> Result<UpdateResult, String> {
    if alt.trim().is_empty() || alt.chars().count() > 120 {
        return Err("画像の説明を1〜120文字で入力してください。".into());
    }
    if !is_iso_date(&display_date) {
        return Err("表示上の更新日を正しく入力してください。".into());
    }
    let info = inspect_buyback_image(path.clone())?;
    let bytes =
        std::fs::read(&path).map_err(|_| "画像ファイルを読み込めませんでした。".to_string())?;
    let (api_url, api_key) = load_connection(&app)?;
    let request = BuybackUpdateRequest {
        file_name: info.file_name,
        mime_type: info.mime_type,
        image_base64: BASE64.encode(bytes),
        display_date,
        alt: alt.trim().into(),
    };
    post_json(
        &format!("{api_url}/api/buyback/update"),
        &api_key,
        &request,
        Duration::from_secs(120),
    )
    .await
}

async fn post_json<T: Serialize + ?Sized, R: DeserializeOwned>(
    url: &str,
    api_key: &str,
    body: &T,
    timeout: Duration,
) -> Result<R, String> {
    let client = Client::builder()
        .timeout(timeout)
        .build()
        .map_err(|_| "通信の準備に失敗しました。".to_string())?;
    let mut last_error = "更新サービスへ接続できませんでした。".to_string();

    for attempt in 0..2 {
        let response = client
            .post(url)
            .header("X-App-Key", api_key)
            .header(header::ORIGIN, "tauri://localhost")
            .json(body)
            .send()
            .await;
        match response {
            Ok(response) if response.status().is_success() => {
                return response
                    .json::<R>()
                    .await
                    .map_err(|_| "更新結果を読み取れませんでした。".to_string());
            }
            Ok(response) => {
                let status = response.status();
                let message = response
                    .json::<ApiError>()
                    .await
                    .ok()
                    .and_then(|value| value.error)
                    .unwrap_or_else(|| http_error_message(status));
                if !status.is_server_error() || attempt == 1 {
                    return Err(message);
                }
                last_error = message;
            }
            Err(error) => {
                last_error = if error.is_timeout() {
                    "更新処理がタイムアウトしました。通信状況を確認して、もう一度お試しください。"
                        .into()
                } else {
                    "更新サービスへ接続できませんでした。通信状況を確認してください。".into()
                };
            }
        }
        tokio_sleep(Duration::from_millis(700)).await;
    }
    Err(last_error)
}

async fn tokio_sleep(duration: Duration) {
    tauri::async_runtime::spawn_blocking(move || std::thread::sleep(duration))
        .await
        .ok();
}

fn load_connection(app: &AppHandle) -> Result<(String, String), String> {
    let api_url = read_api_url(app).ok_or_else(|| "接続設定が完了していません。".to_string())?;
    let api_key = keyring_entry()
        .and_then(|entry| entry.get_password())
        .map_err(|_| "接続キーを読み取れませんでした。接続設定をやり直してください。".to_string())?;
    Ok((api_url, api_key))
}

fn keyring_entry() -> Result<Entry, keyring::Error> {
    Entry::new(KEYRING_SERVICE, KEYRING_USER)
}

fn connection_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|directory| directory.join(CONFIG_FILE))
        .map_err(|_| "接続設定の保存先を確認できませんでした。".to_string())
}

fn read_api_url(app: &AppHandle) -> Option<String> {
    let bytes = std::fs::read(connection_config_path(app).ok()?).ok()?;
    serde_json::from_slice::<ConnectionFile>(&bytes)
        .ok()
        .map(|value| value.api_url)
}

fn is_iso_date(value: &str) -> bool {
    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d").is_ok()
}

fn http_error_message(status: StatusCode) -> String {
    match status {
        StatusCode::UNAUTHORIZED => "接続キーが正しくありません。接続設定を確認してください。".into(),
        StatusCode::CONFLICT => {
            "別の更新と重なりました。最新の状態を確認して、もう一度お試しください。".into()
        }
        StatusCode::PAYLOAD_TOO_LARGE => "送信するファイルの容量が大きすぎます。".into(),
        StatusCode::TOO_MANY_REQUESTS => {
            "短時間に更新が集中しています。少し待ってからお試しください。".into()
        }
        _ => format!("更新サービスでエラーが発生しました（{}）。", status.as_u16()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            parse_inventory_csv,
            export_inventory_errors,
            inspect_buyback_image,
            connection_status,
            save_connection,
            update_inventory,
            update_buyback
        ])
        .run(tauri::generate_context!())
        .expect("error while running Toreca family site updater");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_supported_buyback_image_and_creates_preview() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("buyback.png");
        image::RgbImage::new(400, 500).save(&path).unwrap();
        let info = inspect_buyback_image(path.to_string_lossy().into_owned()).unwrap();
        assert_eq!(info.mime_type, "image/png");
        assert_eq!((info.width, info.height), (400, 500));
        assert!(info.preview_data_url.starts_with("data:image/png;base64,"));
    }

    #[test]
    fn rejects_invalid_and_oversized_buyback_images() {
        let directory = tempfile::tempdir().unwrap();
        let invalid = directory.path().join("invalid.jpg");
        std::fs::write(&invalid, b"not an image").unwrap();
        assert!(inspect_buyback_image(invalid.to_string_lossy().into_owned()).is_err());

        let oversized = directory.path().join("oversized.png");
        std::fs::write(&oversized, vec![0_u8; (MAX_IMAGE_BYTES + 1) as usize]).unwrap();
        assert!(inspect_buyback_image(oversized.to_string_lossy().into_owned()).is_err());
    }
}
