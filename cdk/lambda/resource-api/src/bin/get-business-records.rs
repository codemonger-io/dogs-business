//! Obtains business records carried out by a given dog.
//!
//! ## Environment variables:
//!
//! You have to configure the following environment variables:
//! - `RESOURCE_TABLE_NAME`: name of the DynamoDB table that stores dogs, users,
//!   and their relationships
//! - `BUSINESS_RECORD_TABLE_NAME`: name of the DynamoDB table that stores
//!   business records
//! - `DOG_INDEX_NAME`: name of the global secondary index (GSI) on the
//!   business record table for querying business records by dog IDs

use futures::stream::TryStreamExt as _;
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use business_core::{
    tables::{BusinessRecordTableBuilder, ResourceTable},
    types::BusinessRecord,
};

/// Maximum number of business records to request.
const MAX_BUSINESS_RECORD_COUNT: usize = 200;

/// Shared state.
struct SharedState {
    /// DynamoDB client.
    dynamodb_client: aws_sdk_dynamodb::Client,
    /// Name of the resource table.
    resource_table_name: String,
    /// Name of the business record table.
    business_record_table_name: String,
    /// Name of the GSI for querying business records by dog IDs.
    dog_index_name: String,
}

impl SharedState {
    async fn new() -> Result<Self, Error> {
        // caches the table names
        let resource_table_name = std::env::var("RESOURCE_TABLE_NAME")
            .map_err(|_| "RESOURCE_TABLE_NAME env is not set")?;
        let business_record_table_name = std::env::var("BUSINESS_RECORD_TABLE_NAME")
            .map_err(|_| "BUSINESS_RECORD_TABLE_NAME env is not set")?;
        let dog_index_name = std::env::var("DOG_INDEX_NAME")
            .map_err(|_| "DOG_INDEX_NAME env is not set")?;

        // caches the DynamoDB client
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

        Ok(Self {
            dynamodb_client,
            resource_table_name,
            business_record_table_name,
            dog_index_name,
        })
    }
}

/// Parameters for querying business records.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BusinessRecordsQueryParams {
    /// ID of the user making the request on behalf of the dog who carried out
    /// the business. Must be a friend of the dog.
    user_id: String,
    /// Dog ID to query business records for.
    dog_id: String,
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<BusinessRecordsQueryParams>,
) -> Result<Vec<BusinessRecord>, Error> {
    let BusinessRecordsQueryParams { user_id, dog_id } = event.payload;
    tracing::info!("getting business records: dog={dog_id}, user={user_id}");

    // makes sure that the user is a friend of the dog
    tracing::info!("checking user-dog relationship");
    let resource_table = ResourceTable::new(
        shared_state.dynamodb_client.clone(),
        &shared_state.resource_table_name,
    );
    let relationship = resource_table
        .get_user_dog_relationship(&user_id, &dog_id)
        .await?;
    if relationship.is_none() {
        // TODO: return 403 error
        return Err("only friend dog can be requested".into());
    }

    // queries business records of the dog
    tracing::info!("querying business records");
    let record_table = BusinessRecordTableBuilder::default()
        .client(shared_state.dynamodb_client.clone())
        .table_name(&shared_state.business_record_table_name)
        .dog_index_name(Some(shared_state.dog_index_name.clone()))
        .build()?;
    let records = record_table.query_by_dog_id(&dog_id, MAX_BUSINESS_RECORD_COUNT)?;
    records
        .try_collect()
        .await
        .map_err(Into::into)
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
