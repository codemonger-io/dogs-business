//! Obtains the information on a dog.
//!
//! ## Environment variables
//!
//! You have to configure the following environment variable:
//! - `RESOURCE_TABLE_NAME`: name of the resource table that stores dogs

use aws_sdk_dynamodb::types::{AttributeValue, ReturnConsumedCapacity};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::Deserialize;
use std::sync::Arc;

use resource_api::DogInfo;

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

/// Parameters for getting dog information.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DogRequestParams {
    /// ID of the user who requests the dog information.
    ///
    /// The user must be a guardian or a friend of the dog.
    user_id: String,
    /// ID of the dog.
    dog_id: String,
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<DogRequestParams>,
) -> Result<DogInfo, Error> {
    let DogRequestParams { user_id, dog_id } = event.payload;

    tracing::info!("checking relationship between user and dog: {} - {}", user_id, dog_id);
    let res = shared_state
        .dynamodb_client
        .get_item()
        .table_name(&shared_state.resource_table_name)
        .key("pk", AttributeValue::S(format!("friend-of#{user_id}")))
        .key("sk", AttributeValue::S(format!("dog#{dog_id}")))
        .return_consumed_capacity(ReturnConsumedCapacity::Total)
        .send()
        .await?;
        // TODO: deal with 429 error:
        // - ProvisionedThroughputExceededException
        // - RequestLimitExceeded
        // - ThrottlingException
    tracing::info!("consumed capacity units: {}", res.consumed_capacity.and_then(|c| c.capacity_units()).unwrap_or(f64::NAN));
    if res.item.is_none() {
        // TODO: should be 403 error rather than 404 error
        return Err("only friend dog can be requested".into());
    }

    tracing::info!("getting dog info: {dog_id}");
    let res = shared_state
        .dynamodb_client
        .get_item()
        .table_name(&shared_state.resource_table_name)
        .key("pk", AttributeValue::S(format!("dog#{dog_id}")))
        .key("sk", AttributeValue::S("info".to_string()))
        .return_consumed_capacity(ReturnConsumedCapacity::Total)
        .send()
        .await?;
    tracing::info!("consumed capacity units: {}", res.consumed_capacity.and_then(|c| c.capacity_units()).unwrap_or(f64::NAN));

    // translates the item
    // TODO: errors should raise a data integrity issue (500 error and alert?)
    let item = res.item.ok_or("no dog item")?;
    let name = item
        .get("name")
        .ok_or("name is missing in dog item")
        .and_then(|v| v.as_s().map_err(|e| {
            tracing::error!("name is not a string: {:?}", e);
            "name is not a string"
        }))?
        .clone();

    Ok(DogInfo {
        dog_id,
        name,
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
