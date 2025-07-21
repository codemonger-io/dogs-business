//! Obtains the user information.

use lambda_runtime::{run, service_fn, Error, LambdaEvent};

use serde::{Deserialize, Serialize};

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

async fn function_handler(event: LambdaEvent<UserId>) -> Result<UserInfo, Error> {
    Ok(UserInfo {
        mapbox_access_token: "dummy".to_string(),
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

    run(service_fn(function_handler)).await
}
