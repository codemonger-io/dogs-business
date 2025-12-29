//! Updates the user information.
//!
//! You have to configure the following environment variable:
//! - `RESOURCE_TABLE_NAME`: name of the DynamoDB table to store user information.
//!
//! ### Remarks
//!
//! The user information item may not exist in the table if the user
//! information has never been updated yet.
//! This function will create a new item in such a case.
//!
//! ### Input
//!
//! Every field in the input JSON object other than `userId` and
//! `consistencyToken` is optional and represents an update operation to the
//! corresponding user information attribute.
//! `set` is the only supported operation for now, which sets the attribute to
//! a given value.
//!
//! ```json
//! {
//!   "userId": "User ID",
//!   "consistencyToken": "Consistency Token",
//!   "activeDogId": {
//!     "set": "Dog ID"
//!   }
//! }
//! ```
//!
//! `userId` is the ID of the user whose information is to be updated.
//!
//! `consistencyToken` is the token to ensure that no other concurrent updates
//! have been made to the user information since it was last read by the client.
//! Omitted when no user information item should exist for the user.
//!
//! `activeDogId` is the ID of the currently active dog friend of the user.
//!
//! ### Output
//!
//! Returns the updated user information.
//!
//! ```json
//! {
//!   "userId": "User ID",
//!   "activeDogId": "Dog ID",
//!   "consistencyToken": "Consistency Token"
//! }
//! ```
//!
//! `consistencyToken` is a new token.

use aws_sdk_dynamodb::types::{AttributeValue, ReturnValue};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use resource_api::identifiers::generate_id;

/// Shared state.
///
/// Holds resources reused throughout the lifetime of the Lambda instance.
struct SharedState {
    /// DynamoDB client.
    dynamodb_client: aws_sdk_dynamodb::Client,
    /// Name of the resource table.
    resource_table_name: String,
}

impl SharedState {
    async fn new() -> Result<Self, Error> {
        let resource_table_name = std::env::var("RESOURCE_TABLE_NAME")
            .map_err(|_| "RESOURCE_TABLE_NAME env is not set")?;

        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

        Ok(Self {
            dynamodb_client,
            resource_table_name,
        })
    }
}

/// Updates to user information.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UserInfoUpdates {
    /// ID of the user whose information is to be updated.
    user_id: String,
    /// Consistency token to ensure no concurrent updates have been made.
    consistency_token: Option<String>,
    /// Update to the active dog ID.
    active_dog_id: Option<UpdateOperation<String>>,
}

/// Update operation.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
enum UpdateOperation<T> {
    /// Sets the attribute to the given value.
    Set(T),
}

/// User information.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UserInfo {
    /// ID of the user.
    user_id: String,
    /// ID of the currently active dog friend of the user.
    active_dog_id: Option<String>,
    /// Consistency token.
    consistency_token: String,
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<UserInfoUpdates>,
) -> Result<UserInfo, Error> {
    let UserInfoUpdates {
        user_id,
        consistency_token,
        active_dog_id,
    } = event.payload;

    if let Some(token) = consistency_token {
        // TODO: update the existing user info item
        Err("not yet implemented".into())
    } else {
        // creates a new user info item
        create_user_info(
            &shared_state,
            user_id,
            active_dog_id,
        ).await
    }
}

async fn create_user_info(
    shared_state: &SharedState,
    user_id: String,
    active_dog_id: Option<UpdateOperation<String>>,
) -> Result<UserInfo, Error> {
    tracing::info!("creating a new user info item for user: {user_id}");

    let consistency_token = generate_id();

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
    let now = format!("{now}");

    let mut query_builder = shared_state
        .dynamodb_client
        .put_item()
        .table_name(&shared_state.resource_table_name)
        .item("pk", AttributeValue::S(format!("user#{}", user_id)))
        .item("sk", AttributeValue::S("info".to_string()))
        .item("consistencyToken", AttributeValue::S(consistency_token.clone()))
        .item("createdAt", AttributeValue::N(now.clone()))
        .item("updatedAt", AttributeValue::N(now))
        .return_values(ReturnValue::AllOld)
        .condition_expression("attribute_not_exists(pk)");

    // interprets the active_dog_id update operaiton
    let active_dog_id = if let Some(operation) = active_dog_id {
        match operation {
            UpdateOperation::Set(dog_id) => {
                tracing::info!("updating activeDogId to: {dog_id}");
                // TODO: make sure that the user is a friend of the dog
                query_builder = query_builder
                    .item("activeDogId", AttributeValue::S(dog_id.clone()));
                Some(dog_id)
            }
        }
    } else { None };

    let res = query_builder.send().await?;
    // TODO: deal with retryable errors (should be 429 Too Many Requests or 503 Service Unavailable)
    // TODO: deal with conditional check failure (should be 409 Conflict)

    // extracts old activeDogId if no update was made
    let active_dog_id = if active_dog_id.is_none() {
        res.attributes
            .and_then(|attrs| {
                attrs.get("activeDogId")
                    .map(|v| v.as_s().map(|s| s.to_string()))
                    .map(|v| v.map_err(|_| "activeDogId must be a string"))
            })
            .transpose()?
    } else {
        active_dog_id
    };

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
