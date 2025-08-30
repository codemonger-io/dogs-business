//! Obtains the user information.
//!
//! You have to configure the following environment variable:
//! - `MAPBOX_ACCESS_TOKEN_PARAMETER_PATH`: path to the Mapbox access token in
//!   the AWS Systems Manager Parameter Store.

use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::env;
use std::sync::Arc;

// Shared state.
struct SharedState {
    // Mapbox access token.
    mapbox_access_token: String,
}

impl SharedState {
    async fn new() -> Result<Self, Error> {
        // caches the Mapbox access token
        let mapbox_access_token_parameter_path =
            env::var("MAPBOX_ACCESS_TOKEN_PARAMETER_PATH")
                .map_err(|_| "MAPBOX_ACCESS_TOKEN_PARAMETER_PATH env is not set")?;
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let client = aws_sdk_ssm::Client::new(&config);
        let mapbox_access_token = client
            .get_parameter()
            .name(mapbox_access_token_parameter_path)
            .with_decryption(true)
            .send()
            .await?
            .parameter
            .and_then(|p| p.value)
            .ok_or_else(|| "MAPBOX_ACCESS_TOKEN_PARAMETER_PATH is not configured")?;
        Ok(Self {
            mapbox_access_token,
        })
    }
}

/// User ID.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UserId {
    /// User ID issued by Passquito.
    user_id: String,
}

/// User information.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UserInfo {
    /// Mapbox access token for the user.
    mapbox_access_token: String,
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<UserId>,
) -> Result<UserInfo, Error> {
    Ok(UserInfo {
        mapbox_access_token: shared_state.mapbox_access_token.clone(),
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
