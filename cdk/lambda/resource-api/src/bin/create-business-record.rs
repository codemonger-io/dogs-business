//! Creates a business record.
//!
//! ## Environment variables
//!
//! You have to configure the following environment variables:
//! - `RESOURCE_TABLE_NAME`: name of the resource table to obtain the dog
//!   information from
//! - `BUSINESS_RECORD_TABLE_NAME`: name of the business record table to put a
//!   new business record

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

use business_core::types::BusinessType;
use business_core::web_mercator::{
    normalized_x_from_longitude,
    normalized_y_from_latitude,
    tiles_per_edge_at_zoom,
};

/// Shared state.
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
        // caches the table names
        let resource_table_name = std::env::var("RESOURCE_TABLE_NAME")
            .map_err(|_| "RESOURCE_TABLE_NAME env is not set")?;
        let business_record_table_name = std::env::var("BUSINESS_RECORD_TABLE_NAME")
            .map_err(|_| "BUSINESS_RECORD_TABLE_NAME env is not set")?;

        // caches the DynamoDB client
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let dynamodb_client = aws_sdk_dynamodb::Client::new(&config);

        Ok(Self {
            dynamodb_client,
            resource_table_name,
            business_record_table_name,
        })
    }
}

/// Parameters for creating a business record.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BusinessRecordCreationParams {
    /// ID of the user who makes a request on behalf of the dog who carried out
    /// the business. Must be a friend of the dog.
    user_id: String,
    /// ID of the dog who carried out the business.
    dog_id: String,
    /// Type of the business.
    business_type: BusinessType,
    /// Location of the business.
    location: GeolocationCoordinates,
}

/// Information on a business record.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BusinessRecord {
    /// ID of the business record.
    record_id: String,
    /// ID of the dog who carried out the business.
    dog_id: String,
    /// Type of the business.
    business_type: BusinessType,
    /// Location of the business.
    location: GeolocationCoordinates,
    /// Timestamp when the business record was created.
    ///
    /// Represented as the number of seconds elapsed since 00:00:00 on
    /// January 1, 1970 UTC.
    timestamp: u64,
}

/// Geographic location coordinates.
#[derive(Clone, Debug, Deserialize, Serialize)]
struct GeolocationCoordinates {
    /// Longitude in degrees.
    longitude: f64,
    /// Latitude in degrees.
    latitude: f64,
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<BusinessRecordCreationParams>,
) -> Result<BusinessRecord, Error> {
    let BusinessRecordCreationParams {
        user_id,
        dog_id,
        business_type,
        location,
    } = event.payload;
    let GeolocationCoordinates {
        longitude,
        latitude,
    } = location;

    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();

    // makes sure that the user is a friend of the dog
    tracing::info!("checking if user {user_id} is a friend of dog {dog_id}");
    let relationship = shared_state
        .dynamodb_client
        .get_item()
        .table_name(&shared_state.resource_table_name)
        .key("pk", AttributeValue::S(format!("friend-of#{user_id}")))
        .key("sk", AttributeValue::S(format!("dog#{dog_id}")))
        .return_consumed_capacity(ReturnConsumedCapacity::Total)
        .send()
        .await?;
    tracing::info!("consumed capacity: {}", relationship.consumed_capacity.and_then(|c| c.capacity_units).unwrap_or(f64::NAN));
    // TODO: deal with 429 errors
    // - ProvisionedThroughputExceededException
    // - RequestLimitExceeded
    // - ThrottlingException
    if relationship.item.is_none() {
        return Err("user must be a friend of the dog".into());
    }

    // calculates tile coordinates of all the zoom levels
    let normalized_x = normalized_x_from_longitude(longitude);
    let all_x: Vec<u32> = (0..=22)
        .map(|z| (tiles_per_edge_at_zoom(z) * normalized_x).floor() as u32)
        .collect();
    let normalized_y = normalized_y_from_latitude(latitude);
    let all_y: Vec<u32> = (0..=22)
        .map(|z| (tiles_per_edge_at_zoom(z) * normalized_y).floor() as u32)
        .collect();
    let all_tile_coords: Vec<String> = all_x
        .into_iter()
        .zip(all_y.into_iter())
        .map(|(x, y)| format!("{x}/{y}"))
        .collect();

    // randomly generates a new record ID and encodes it in URL-safe Base64
    let record_id = Uuid::new_v4();
    let record_id = base64_encoder.encode(&record_id);

    // creates a private business record
    tracing::info!("putting private business record");
    let request = shared_state
        .dynamodb_client
        .put_item()
        .table_name(&shared_state.business_record_table_name)
        .item("pk", AttributeValue::S(record_id.clone()))
        .item("sk", AttributeValue::S("private".to_string()))
        .item("dogId", AttributeValue::S(dog_id.clone()))
        .item("businessType", AttributeValue::S(business_type.to_string()))
        .item("longitude", AttributeValue::N(format_geo_coordinate(longitude)))
        .item("latitude", AttributeValue::N(format_geo_coordinate(latitude)))
        .item("timestamp", AttributeValue::N(timestamp.to_string()));
    let request = all_tile_coords
        .iter()
        .enumerate()
        .fold(request, |request, (z, tile_coord)| {
            request.item(
                format!("tileAtZ{z}"),
                AttributeValue::S(format!("dog#{dog_id}#{tile_coord}")),
            )
        });
    let res = request
        .return_consumed_capacity(ReturnConsumedCapacity::Total)
        .send()
        .await?;
    tracing::info!("consumed capacity: {}", res.consumed_capacity.and_then(|c| c.capacity_units).unwrap_or(f64::NAN));

    // leaves the latter half of the dog ID as the masked (semi-unique) dog ID
    let (_, masked_dog_id) = dog_id.split_at(dog_id.len() / 2);

    // creates a public business record
    tracing::info!("putting public business record");
    let request = shared_state
        .dynamodb_client
        .put_item()
        .table_name(&shared_state.business_record_table_name)
        .item("pk", AttributeValue::S(record_id.clone()))
        .item("sk", AttributeValue::S("public".to_string()))
        .item("maskedDogId", AttributeValue::S(masked_dog_id.to_string()))
        .item("isAdvocated", AttributeValue::Bool(true)) // TODO: use dog's advocacy setting
        .item("businessType", AttributeValue::S(business_type.to_string()))
        .item("longitude", AttributeValue::N(format_geo_coordinate(longitude)))
        .item("latitude", AttributeValue::N(format_geo_coordinate(latitude)))
        .item("timestamp", AttributeValue::N((timestamp / 3600).to_string()));
    let request = all_tile_coords
        .iter()
        .enumerate()
        .fold(request, |request, (z, tile_coord)| {
            request.item(
                format!("tileAtZ{z}"),
                AttributeValue::S(format!("public#{tile_coord}")),
            )
        });
    let res = request
        .return_consumed_capacity(ReturnConsumedCapacity::Total)
        .send()
        .await?;
    tracing::info!("consumed capacity: {}", res.consumed_capacity.and_then(|c| c.capacity_units).unwrap_or(f64::NAN));

    Ok(BusinessRecord {
        record_id,
        dog_id,
        business_type,
        location: GeolocationCoordinates {
            longitude,
            latitude,
        },
        timestamp,
    })
}

/// Formats a geographic coordinate (longitude or latitude) as a string.
fn format_geo_coordinate(coord: f64) -> String {
    format!("{coord:.10}")
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
