//! Obtains a tile access token.
//!
//! ## Environment variables
//!
//! You must specify the following environment variable:
//! - `TILE_ACCESS_TOKEN_SECRET_PARAMETER_PATH`: path to the AWS Systems
//!   Manager (SSM) Parameter Store parameter that contains the secret key to
//!   sign tile access tokens.
//! - `TILE_ACCESS_TOKEN_EXPIRATION_SECONDS`: duration in seconds for which a
//!   tile access token is valid.
//! - `TILE_ACCESS_TOKEN_SAFETY_MARGIN_SECONDS`: safety margin in seconds to
//!   update tile access tokens before they actually expires. Must be shorter
//!   than `TILE_ACCESS_TOKEN_TTL_SECONDS`.
//! - `SESSION_TABLE_NAME`: name of the DynamoDB table to store sessions.
//!
//! ## Input
//!
//! Does not matter. Should be an empty JSON object.
//!
//! ## Output
//!
//! A JSON object similar to the following:
//!
//! ```json
//! {
//!   "token": "Token string",
//!   "expiresIn": 900
//! }
//! ```

use aws_sdk_dynamodb::types::AttributeValue;
use base64::{engine::general_purpose::STANDARD as base64_engine, Engine as _};
use hmac::{Hmac, Mac as _};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::Serialize;
use sha2::Sha256;
use std::sync::Arc;
use std::time::{Duration, SystemTime};

use map_auth::{ByteArrayExt as _, TileAccessTokenBytes};

/// Shared state that lives while the Lambda instance is alive.
struct SharedState {
    /// Secret key to sign tile access tokens.
    secret_key: String,

    /// Safety margin in seconds to update tile access tokens before they
    /// actually expire.
    safety_margin_seconds: Duration,

    /// DynamoDB client.
    dynamodb_client: aws_sdk_dynamodb::Client,

    /// Session table name.
    session_table_name: String,
}

impl SharedState {
    /// Creates a new `SharedState`.
    async fn new() -> Result<Self, Error> {
        // reads the parameter path of the secret to sign tile access tokens from env
        let tile_access_token_secret_parameter_path = std::env::var("TILE_ACCESS_TOKEN_SECRET_PARAMETER_PATH")
            .map_err(|_| "TILE_ACCESS_TOKEN_SECRET_PARAMETER_PATH env is not set")?;
        // reads the secret from the SSM Parameter Store
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let ssm_client = aws_sdk_ssm::Client::new(&config);
        let secret_key = ssm_client
            .get_parameter()
            .name(tile_access_token_secret_parameter_path)
            .with_decryption(true)
            .send()
            .await?
            .parameter
            .and_then(|p| p.value)
            .ok_or_else(|| "no secret for tile access tokens stored in the Parameter Store")?;

        // reads the safety margin from env
        let safety_margin_seconds = std::env::var("TILE_ACCESS_TOKEN_SAFETY_MARGIN_SECONDS")
            .map_err(|_| "TILE_ACCESS_TOKEN_SAFETY_MARGIN_SECONDS env is not set")
            .and_then(|s| {
                s.parse::<u64>().map_err(|_| "TILE_ACCESS_TOKEN_SAFETY_MARGIN_SECONDS env must be zero or a positive integer")
            })
            .map(Duration::from_secs)?;

        // initializes a DynamoDB client
        let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

        // reads the session table name from env
        let session_table_name = std::env::var("SESSION_TABLE_NAME")
            .map_err(|_| "SESSION_TABLE_NAME env is not set")?;

        Ok(Self {
            secret_key,
            safety_margin_seconds,
            dynamodb_client,
            session_table_name,
        })
    }
}

/// Tile access token.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TileAccessToken {
    /// String representation of the token.
    ///
    /// Base64 encoded bytes.
    token: String,

    /// Duration in seconds for which the token is valid.
    ///
    /// The value may vary token to token, because the same token may be
    /// repeatedly returned before it expires.
    expires_in: u64,
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    _event: LambdaEvent<serde_json::Value>,
) -> Result<TileAccessToken, Error> {
    tracing::info!("obtaining tile access token: safety margin={}", shared_state.safety_margin_seconds.as_secs());

    // reuses a previously issued token if it is not expiring within the safety margin
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .expect("Unix time should be valid")
        .as_secs();
    let min_expires_at = now + shared_state.safety_margin_seconds.as_secs();
    let existing_token = shared_state
        .dynamodb_client
        .query()
        .table_name(&shared_state.session_table_name)
        .key_condition_expression("#pk = :pk AND #sk >= :min_expires_at")
        .expression_attribute_names("#pk", "pk")
        .expression_attribute_names("#sk", "sk")
        .expression_attribute_values(
            ":pk",
            AttributeValue::S("tile-access-token#global".to_string()),
        )
        .expression_attribute_values(
            ":min_expires_at",
            AttributeValue::N(format!("{min_expires_at}")),
        )
        .scan_index_forward(false) // newest first
        .limit(1)
        .send()
        .await?
        .items
        .and_then(|items| items.first().map(|item| {
            let expires_at = item
                .get("sk")
                .ok_or_else(|| {
                    tracing::warn!("missing expiration time (sk) in the session table");
                })
                .and_then(|v| v.as_n().map_err(|_| {
                    tracing::warn!("invalid expiration time (sk) in the session table");
                }))
                .and_then(|t| t.parse::<u64>().map_err(|e| {
                    tracing::warn!("malformed expiration time (sk) in the session table: {e}");
                }));
            let token = item
                .get("token")
                .ok_or_else(|| {
                    tracing::warn!("missing tile access token in the session table");
                })
                .and_then(|v| v.as_s().map_err(|_| {
                    tracing::warn!("invalid tile access token in the session table");
                }));
            match (expires_at, token) {
                (Ok(expires_at), Ok(token)) => Ok((expires_at, token.clone())),
                _ => Err("invalid item in the session table")
            }
        }))
        .transpose()?;
    if let Some((expires_at, token)) = existing_token {
        let expires_in = expires_at - now; // ignores the latency of the table query
        tracing::info!("reusing existing tile access token: expires_in={expires_in}");
        return Ok(TileAccessToken {
            token,
            expires_in,
        });
    }

    // otherwise, issues a new token
    tracing::info!("issuing new tile access token");

    // TODO: obtain the duration from the env
    let expires_in: u64 = 15 * 60;
    let expires_at = now + expires_in;
    let expires_at_bytes = expires_at.to_be_bytes();

    // calculates hash
    let mut mac = Hmac::<Sha256>::new_from_slice(shared_state.secret_key.as_bytes())?;
    mac.update(&expires_at_bytes);
    let hash = mac.finalize();

    // combines the expiration time and the hash
    let mut token_bytes = TileAccessTokenBytes::zeros();
    token_bytes[..8].copy_from_slice(&expires_at_bytes);
    token_bytes[8..].copy_from_slice(&hash.into_bytes());

    // Base64-encodes the token bytes
    let token = base64_engine.encode(&token_bytes);

    // saves the token in the session table
    tracing::info!("saving tile access token in the session table");
    shared_state
        .dynamodb_client
        .put_item()
        .table_name(&shared_state.session_table_name)
        .item("pk", AttributeValue::S("tile-access-token#global".to_string()))
        .item("sk", AttributeValue::N(format!("{expires_at}")))
        .item("token", AttributeValue::S(token.clone()))
        .item("createdAt", AttributeValue::N(format!("{now}")))
        .send()
        .await?;

    Ok(TileAccessToken {
        token,
        expires_in,
    })
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        // disable printing the name of the module in every log line.
        .with_target(false)
        // disabling time is handy because CloudWatch will add the ingestion time.
        .without_time()
        .init();

    let shared_state = Arc::new(SharedState::new().await?);
    run(service_fn(|req| async {
        function_handler(shared_state.clone(), req).await
    })).await
}
