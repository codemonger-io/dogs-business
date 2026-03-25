//! Obtains the human friends of a dog.
//!
//! ## Environment variables
//!
//! You have to configure the following environment variables:
//! - `RESOURCE_TABLE_NAME`: name of the resource table that stores dogs
//! - `DOG_INDEX_NAME`: name of the global secondary index (GSI) that can query
//!   relationships by a dog ID
//! - `USER_POOL_ID`: ID of the user pool that manages the users

use futures::{future::TryFutureExt as _, stream::TryStreamExt as _};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use business_core::tables::ResourceTable;

/// State shared.
///
/// Holds resources reused throughout the lifetime of the Lambda instance.
struct SharedState {
    /// DynamoDB client.
    dynamodb_client: aws_sdk_dynamodb::Client,
    /// Cognito client
    cognito_client: aws_sdk_cognitoidentityprovider::Client,
    /// Name of the resource table.
    resource_table_name: String,
    /// Name of the GSI that can query relationships by a dog ID.
    dog_index_name: String,
    /// ID of the user pool that manages the users.
    user_pool_id: String,
}

impl SharedState {
    async fn new() -> Result<Self, Error> {
        let resource_table_name = std::env::var("RESOURCE_TABLE_NAME")
            .map_err(|_| "RESOURCE_TABLE_NAME env is not set")?;
        let dog_index_name = std::env::var("DOG_INDEX_NAME")
            .map_err(|_| "DOG_INDEX_NAME env is not set")?;
        let user_pool_id = std::env::var("USER_POOL_ID")
            .map_err(|_| "USER_POOL_ID env is not set")?;

        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);
        let cognito_client = aws_sdk_cognitoidentityprovider::Client::new(&config);

        Ok(Self {
            dynamodb_client,
            cognito_client,
            resource_table_name,
            dog_index_name,
            user_pool_id,
        })
    }
}

/// Request parameters.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RequestParams {
    /// ID of the user making the request.
    user_id: String,
    /// Dog ID to query the human friends of.
    dog_id: String,
}

/// Information about a human friend of a dog.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HumanFriendInfo {
    /// ID of the dog.
    dog_id: String,
    /// ID of the human friend.
    user_id: String,
    /// Name of the human friend.
    user_name: String,
    /// Whether the human friend is a guardian of the dog.
    is_guardian: bool,
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<RequestParams>,
) -> Result<Vec<HumanFriendInfo>, Error> {
    let RequestParams { user_id, dog_id } = event.payload;

    let resource_table = ResourceTable::new(
        shared_state.dynamodb_client.clone(),
        &shared_state.resource_table_name,
    )
        .with_dog_index(&shared_state.dog_index_name);

    tracing::info!("checking relationship between user and dog: {} - {}", user_id, dog_id);
    resource_table
        .get_user_dog_relationship(&user_id, &dog_id)
        .await?
        // TODO: return 403 error
        .ok_or_else(|| "no relationship between user and dog")?;

    let human_friends = resource_table
        .get_human_friends_of_dog(&dog_id)
        .map_err(Into::into)
        .and_then(move |friendship| {
            resolve_user_name_by_id(
                shared_state.clone(),
                friendship.user_id.to_string(),
            )
                .map_ok(|user_name| (friendship, user_name))
        })
        .map_ok(|(friendship, user_name)| HumanFriendInfo {
            dog_id: friendship.dog_id,
            user_id: friendship.user_id.clone(),
            user_name,
            is_guardian: friendship.is_guardian,
        })
        .try_collect()
        .await?;

    Ok(human_friends)
}

async fn resolve_user_name_by_id(
    shared_state: Arc<SharedState>,
    user_id: String,
) -> Result<String, Error> {
    let response = shared_state
        .cognito_client
        .list_users()
        .user_pool_id(&shared_state.user_pool_id)
        .filter(format!(r#"username = "{user_id}""#))
        .limit(1)
        .send()
        .await?;
    let name = response
        .users
        .and_then(|mut users| users.pop())
        .ok_or_else(|| "no user found in user pool")
        .and_then(|user| user.attributes.ok_or_else(|| "user has no attributes"))
        .and_then(|attrs| {
            attrs
                .into_iter()
                .find(|attr| attr.name == "name")
                .and_then(|attr| attr.value)
                .ok_or_else(|| "user has no name attribute")
        })?;
    Ok(name)
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
