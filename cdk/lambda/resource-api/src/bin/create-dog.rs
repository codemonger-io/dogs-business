//! Creates a new dog.
//!
//! ## Environment variables
//!
//! You have to configure the following environment variable:
//! - `RESOURCE_TABLE_NAME`: name of the resource table to put a new dog

use aws_sdk_dynamodb::types::{AttributeValue, ReturnConsumedCapacity};
use base64::{
    engine::general_purpose::URL_SAFE_NO_PAD as base64_encoder,
    Engine as _,
};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

/// Shared state.
struct SharedState {
    /// DynamoDB client.
    dynamodb_client: aws_sdk_dynamodb::Client,
    /// Name of the resource table.
    resource_table_name: String,
}

impl SharedState {
    async fn new() -> Result<Self, Error> {
        // caches the resource table name
        let resource_table_name = std::env::var("RESOURCE_TABLE_NAME")
            .map_err(|_| "RESOURCE_TABLE_NAME env is not set")?;
        // caches the DynamoDB client
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);
        Ok(Self {
            dynamodb_client,
            resource_table_name,
        })
    }
}

/// Parameters for creating a dog.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DogCreationParams {
    /// ID of the user to be the guardian of the new dog.
    user_id: String,
    /// Name of the dog.
    name: String,
}

/// Information about a dog.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DogInfo {
    /// ID of the dog.
    dog_id: String,
    /// Name of the dog.
    name: String,
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<DogCreationParams>,
) -> Result<DogInfo, Error> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();

    // randomly generates a new dog ID and encodes it in URL-safe Base64
    let dog_id = Uuid::new_v4();
    let dog_id = base64_encoder.encode(&dog_id);

    // puts the dog into the resource table
    // treats (almost impossible) ID duplication as an internal error
    tracing::info!("putting new dog: {dog_id}");
    let res = shared_state
        .dynamodb_client
        .put_item()
        .table_name(&shared_state.resource_table_name)
        .item("pk", AttributeValue::S(format!("dog#{dog_id}")))
        .item("sk", AttributeValue::S("info".to_string()))
        .item("name", AttributeValue::S(event.payload.name.clone()))
        .item("createdAt", AttributeValue::N(now.to_string()))
        .item("updatedAt", AttributeValue::N(now.to_string()))
        .condition_expression("attribute_not_exists(pk)") // no update
        .return_consumed_capacity(ReturnConsumedCapacity::Total)
        .send()
        .await?;
        // TODO: deal with 429 error:
        // - ProvisionedThroughputExceededException
        // - RequestLimitExceeded
        // - ThrottlingException
    tracing::info!("consumed capacity units: {}", res.consumed_capacity.and_then(|c| c.capacity_units()).unwrap_or(f64::NAN));

    // adds the relationship between the user and the dog
    // TODO: check if the user exists
    let user_id = &event.payload.user_id;
    tracing::info!("adding user-dog relationship: {} - {}", user_id, dog_id);
    let res = shared_state
        .dynamodb_client
        .put_item()
        .table_name(&shared_state.resource_table_name)
        .item("pk", AttributeValue::S(format!("friend-of#{user_id}")))
        .item("sk", AttributeValue::S(format!("dog#{dog_id}")))
        .item("isGuardian", AttributeValue::Bool(true))
        .item("createdAt", AttributeValue::N(now.to_string()))
        .condition_expression("attribute_not_exists(pk)") // no update
        .return_consumed_capacity(ReturnConsumedCapacity::Total)
        .send()
        .await?;
        // TODO: deal with 429 error:
        // - ProvisionedThroughputExceededException
        // - RequestLimitExceeded
        // - ThrottlingException
    tracing::info!("consumed capacity units: {}", res.consumed_capacity.and_then(|c| c.capacity_units()).unwrap_or(f64::NAN));

    Ok(DogInfo {
        dog_id,
        name: event.payload.name.clone(),
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
