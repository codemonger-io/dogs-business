//! Operates business records carried out by a given dog.
//!
//! ## Environment variables:
//!
//! You have to configure the following environment variables:
//! - `RESOURCE_TABLE_NAME`: name of the DynamoDB table that stores dogs, users,
//!   and their relationships
//! - `BUSINESS_RECORD_TABLE_NAME`: name of the DynamoDB table that stores
//!   business records
//!
//! ## Operations
//!
//! ### Delete
//!
//! #### Input
//!
//! ```json
//! {
//!   "userId": "User ID",
//!   "dogId": "Dog ID or dash (`-`)",
//!   "delete": {
//!     "recordId": "Business record ID"
//!   }
//! }
//! ```
//!
//! #### Output
//!
//! ```json
//! {}
//! ```

use futures::{future, stream::TryStreamExt as _};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use business_core::tables::{BusinessRecordTableBuilder, ResourceTable};

/// Shared state.
///
/// Holds resources reused throughout the lifetime of the Lambda instance.
struct SharedState {
    /// DynamoDB client.
    dynamodb_client: aws_sdk_dynamodb::Client,
    /// Name of the resource table.
    resource_table_name: String,
    /// Name of the business record table.
    business_record_table_name: String,
}

impl SharedState {
    async fn new() -> Result<Self, Error> {
        let resource_table_name = std::env::var("RESOURCE_TABLE_NAME")
            .map_err(|_| "RESOURCE_TABLE_NAME env is not set")?;
        let business_record_table_name = std::env::var("BUSINESS_RECORD_TABLE_NAME")
            .map_err(|_| "BUSINESS_RECORD_TABLE_NAME env is not set")?;

        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

        Ok(Self {
            dynamodb_client,
            resource_table_name,
            business_record_table_name,
        })
    }
}

/// Request.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Request {
    /// ID of the user who made the request on behalf of the dog.
    user_id: String,
    /// ID of the dog who carried out the business.
    ///
    /// May be omitted by specifying a dash (`-`) for deletion.
    dog_id: String,
    /// Operation of the request.
    #[serde(flatten)]
    operation: Operation,
}

/// Operation.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Operation {
    /// Deletes a business record.
    #[serde(rename_all = "camelCase")]
    Delete {
        /// ID of the business record to delete.
        record_id: String,
    }
}

/// Response.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase", untagged)]
enum Response {
    /// Deletion result.
    Deleted {},
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<Request>,
) -> Result<Response, Error> {
    let Request {
        user_id,
        dog_id,
        operation,
    } = event.payload;
    tracing::info!("operating business record: dog={dog_id}, user={user_id}");

    match operation {
        Operation::Delete { record_id } => {
            delete_business_record(shared_state, user_id, dog_id, record_id).await?;
            Ok(Response::Deleted {})
        }
    }
}

async fn delete_business_record(
    shared_state: Arc<SharedState>,
    user_id: String,
    dog_id: String,
    record_id: String,
) -> Result<(), Error> {
    tracing::info!("deleting business record: {record_id}");

    // if dog_id is omitted (`-`), collects possible dog friend IDs of the user.
    // otherwise, makes sure that the user is a friend of the dog.
    let resource_table = ResourceTable::new(
        shared_state.dynamodb_client.clone(),
        &shared_state.resource_table_name,
    );
    let dog_ids = if dog_id == "-" {
        tracing::info!("collecting dog friend IDs fo the user");
        resource_table
            .get_dog_friends_of_user(&user_id)
            .and_then(|friendship| future::ok(friendship.dog_id))
            .try_collect()
            .await?
    } else {
        tracing::info!("checking user-dog relationship");
        resource_table
            .get_user_dog_relationship(&user_id, &dog_id)
            .await?
            .ok_or_else(|| "no relationship between user and dog")?;
        vec![dog_id]
    };

    // deletes the private record
    let record_table = BusinessRecordTableBuilder::default()
        .client(shared_state.dynamodb_client.clone())
        .table_name(&shared_state.business_record_table_name)
        .build()?;
    record_table.delete_made_by_dogs(&record_id, &dog_ids).await?;

    Ok(())
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
