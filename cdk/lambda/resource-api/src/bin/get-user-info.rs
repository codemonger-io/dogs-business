//! Obtains the user information.
//!
//! You have to configure the following environment variable:
//! - `RESOURCE_TABLE_NAME`: name of the DynamoDB table that stores user information.
//!
//! ### Remarks
//!
//! The user information item may not exist in the table if the user
//! information has never been updated yet.
//! This function will return a default user information in such a case.
//!
//! ### Input
//!
//! ```json
//! {
//!   "userId": "User ID"
//! }
//! ```
//!
//! ### Output
//!
//! ```json
//! {
//!   "userId": "User ID",
//!   "activeDogId": "Dog ID",
//!   "consistencyToken": "Consistency Token"
//! }
//! ```
//!
//! `activeDogId` is the ID of the currently active dog friend of the user.
//! Omitted if no user information is stored.
//!
//! `consistencyToken` is a token to detect concurrent updates.
//! Omitted if no user information is stored.

use aws_sdk_dynamodb::types::AttributeValue;
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::env;
use std::sync::Arc;

/// Shared state.
struct SharedState {
    /// DynamoDB client.
    dynamodb_client: aws_sdk_dynamodb::Client,
    /// Name of the DynamoDB table to store user information.
    resource_table_name: String,
}

impl SharedState {
    async fn new() -> Result<Self, Error> {
        let resource_table_name = env::var("RESOURCE_TABLE_NAME")
            .map_err(|_| "RESOURCE_TABLE_NAME env is not set")?;

        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

        Ok(Self {
            dynamodb_client,
            resource_table_name,
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
    /// User ID.
    user_id: String,
    /// ID of the currently active dog friend of the user.
    #[serde(skip_serializing_if = "Option::is_none")]
    active_dog_id: Option<String>,
    /// Consistency token to detect concurrent updates.
    #[serde(skip_serializing_if = "Option::is_none")]
    consistency_token: Option<String>,
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<UserId>,
) -> Result<UserInfo, Error> {
    let UserId { user_id } = event.payload;

    let res = shared_state
        .dynamodb_client
        .get_item()
        .table_name(&shared_state.resource_table_name)
        .key("pk", AttributeValue::S(format!("user#{}", user_id)))
        .key("sk", AttributeValue::S("info".to_string()))
        .send()
        .await?;
    // TODO: deal with retryable errors

    if res.item.is_none() {
        tracing::info!("no user info found for user_id={user_id}");
    }

    let active_dog_id = res
        .item
        .as_ref()
        .and_then(|item| {
            item.get("activeDogId")
                .map(|v| v.as_s().map(|s| s.clone()).map_err(|_| "activeDogId is not a string"))
        })
        .transpose()?;

    let consistency_token = res
        .item
        .as_ref()
        .map(|item| {
            item.get("consistencyToken")
                .ok_or_else(|| "consistencyToken is missing")
                .and_then(|v| v.as_s().map(|s| s.clone()).map_err(|_| "consistencyToken is not a string"))
        })
        .transpose()?;

    Ok(UserInfo {
        user_id,
        active_dog_id,
        consistency_token,
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
