//! Invites a human friend to be a friend of a dog.
//!
//! To become a guardian of a dog, a user first needs to be a friend of the dog.
//!
//! ## Environment variables
//!
//! You have to configure the following environment variable:
//! - `RESOURCE_TABLE_NAME`: name of the resource table to put the invitation record
//!
//! ## Commands
//!
//! This function determines the behavior based on the input.
//! The input has the following common structure where `{command-name}` is the
//! name of the command and the value is command-specific parameters.
//!
//! ```json
//! {
//!   "{command-name}": {}
//! }
//! ```
//!
//! ### Create an invitation
//!
//! #### Input
//!
//! ```json
//! {
//!   "create": {
//!     "userId": "User ID",
//!     "dogId": "Dog ID"
//!   }
//! }
//! ```
//!
//! #### Output
//!
//! ```json
//! {
//!   "invitationId": "Invitation ID",
//!   "payload": {
//!     "type": "issued",
//!     "expiresAt": 123
//!   }
//! }
//! ```
//!
//! `expiresAt` is represented as the number of seconds elapsed since 00:00:00
//! on January 1, 1970 UTC.
//!
//! The default duration of validity of an invitation is 5 minutes.
//! (not configurable yet)
//!
//! #### Errors
//!
//! If the user is not a guardian of the dog.
//!
//! ```json
//! {
//!   "errorType": "Forbidden",
//!   "errorMessage": "Forbidden(...)"
//! }
//! ```
//!
//! The error should be treated as a 403 Forbidden at the integration level.
//!
//! ### Get status of an invitation
//!
//! #### Input
//!
//! ```json
//! {
//!   "get": {
//!     "invitationId": "Invitation ID"
//!   }
//! }
//! ```
//!
//! #### Output
//!
//! If the user is eligible to accept the invitation:
//!
//! ```json
//! {
//!   "invitationId": "Invitation ID",
//!   "payload": {
//!     "type": "eligible",
//!     "dogName": "Dog name"
//!   }
//! }
//! ```
//!
//! If the user is already a friend of the dog who issued the invitation:
//!
//! ```json
//! {
//!   "invitationId": "Invitation ID",
//!   "payload": {
//!     "type": "duplicated",
//!     "dogId": "Dog ID"
//!   }
//! }
//! ```
//!
//! `dogName` is the name of the dog who issued the invitation.
//!
//! #### Errors
//!
//! If the invitation has expired or does not exist,
//!
//! ```json
//! {
//!   "errorType": "NotFound",
//!   "errorMessage": "NotFound(...)"
//! }
//! ```
//!
//! The error should be treated as a 404 Not Found at the integration level.
//!
//! ### Accept an invitation
//!
//! #### Input
//!
//! ```json
//! {
//!   "accept": {
//!     "userId": "User ID",
//!     "invitationId": "Invitation ID"
//!   }
//! }
//! ```
//!
//! #### Output
//!
//! If the acceptance is successful:
//!
//! ```json
//! {
//!   "invitationId": "Invitation ID",
//!   "payload": {
//!     "type": "accepted",
//!     "dogId": "Dog ID"
//!   }
//! }
//! ```
//!
//! If the user is already a friend of the dog who issued the invitation:
//!
//! ```json
//! {
//!   "invitationId": "Invitation ID",
//!   "payload": {
//!     "type": "duplicated",
//!     "dogId": "Dog ID"
//!   }
//! }
//! ```
//!
//! #### Errors
//!
//! If the invitation has expired or does not exist:
//!
//! ```json
//! {
//!   "errorType": "NotFound",
//!   "errorMessage": "NotFound(...)"
//! }
//! ```
//!
//! The error should be treated as a 404 Not Found at the integration level.

use aws_sdk_dynamodb::types::{AttributeValue, ReturnValue};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use resource_api::identifiers::generate_id;

/// Shared state.
///
/// Holds resources reused throughout the lifetime of the Lambda instance.
struct SharedState {
    /// DynamoDB client.
    dynamodb_client: aws_sdk_dynamodb::Client,
    /// Name of the resource table.
    resource_table_name: String,
    /// Duration of validity of an invitation.
    duration_of_validity: Duration,
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
            // TODO: make it configurable
            duration_of_validity: Duration::from_secs(5 * 60),
        })
    }
}

/// Commands to this function.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Command {
    /// Create an invitation.
    Create(CreateInvitationParams),
    /// Get the status of an invitation.
    Get(GetInvitationParams),
    /// Accept an invitation.
    Accept(AcceptInvitationParams),
}

/// Parameters for creation of an invitation.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateInvitationParams {
    /// ID of the user who issues the invitation on behalf of the dog.
    ///
    /// The user must be a guardian of the dog.
    user_id: String,
    /// ID of the dog who wants to invite a human friend.
    dog_id: String,
}

/// Parameters for getting the status of an invitation.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GetInvitationParams {
    /// ID of the user who wants to get the status of the invitation.
    user_id: String,
    /// ID of the invitation.
    invitation_id: String,
}

/// Parameters for accepting an invitation.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AcceptInvitationParams {
    /// ID of the user who accepts the invitation.
    user_id: String,
    /// ID of the invitation.
    invitation_id: String,
}

/// Invitation.
///
/// This is a container of information on an invitation that depends on the
/// command.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Invitation<T>
where
    T: Serialize,
{
    /// ID of the invitation.
    invitation_id: String,
    /// Payload of the invitation that depends on the executed command.
    payload: T,
}

/// Payload corresponding to [`Command::Create`].
#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum CreateInvitationPayload {
    /// Newly issued invitation.
    #[serde(rename_all = "camelCase")]
    Issued {
        /// Expiration time of the invitation.
        ///
        /// Represented as the number of seconds elapsed since 00:00:00 on
        /// January 1, 1970 UTC.
        expires_at: u64,
    },
}

/// Payload corresponding to [`Command::Get`].
#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum GetInvitationPayload {
    /// The user is eligible to accept the invitation.
    #[serde(rename_all = "camelCase")]
    Eligible {
        /// Name of the dog who issued the invitation.
        dog_name: String,
    },
    /// The user is already a friend of the dog who issued the invitation.
    #[serde(rename_all = "camelCase")]
    Duplicated {
        /// ID of the dog who issued the invitation.
        dog_id: String,
    },
}

/// Payload corresponding to [`Command::Accept`].
#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum AcceptInvitationPayload {
    /// The invitation was accepted.
    #[serde(rename_all = "camelCase")]
    Accepted {
        /// ID of the dog who issued the invitation.
        dog_id: String,
    },
    /// The user is already a friend of the dog who issued the invitation.
    #[serde(rename_all = "camelCase")]
    Duplicated {
        /// ID of the dog who issued the invitation.
        dog_id: String,
    },
}

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<Command>,
) -> Result<Value, Error> {
    match event.payload {
        Command::Create(params) => {
            create_invitation(shared_state, params).await
                .and_then(|result| serde_json::to_value(result).map_err(Into::into))
        }
        Command::Get(params) => {
            get_invitation(shared_state, params).await
                .and_then(|result| serde_json::to_value(result).map_err(Into::into))
        }
        Command::Accept(params) => {
            accept_invitation(shared_state, params).await
                .and_then(|result| serde_json::to_value(result).map_err(Into::into))
        }
    }
}

async fn create_invitation(
    shared_state: Arc<SharedState>,
    CreateInvitationParams { user_id, dog_id }: CreateInvitationParams,
) -> Result<Invitation<CreateInvitationPayload>, Error> {
    // makes sure that the user is a guardian of the dog.
    tracing::info!("chekcing if user {user_id} is a guardian of dog {dog_id}");
    let relationship = shared_state
        .dynamodb_client
        .get_item()
        .table_name(&shared_state.resource_table_name)
        .key("pk", AttributeValue::S(format!("friend-of#{user_id}")))
        .key("sk", AttributeValue::S(format!("dog#{dog_id}")))
        .send()
        .await?;
    // TODO: deal with retryable errors
    // - ProvisionedThroughputExceededException
    // - RequestLimitExceeded
    // - ThrottlingException
    let is_guardian = relationship
        .item
        .and_then(|item| item.get("isGuardian").map(|v| {
            v.as_bool().map(|&b| b).map_err(|_| "isGuardian attribute must be a boolean")
        }))
        .transpose()?
        .ok_or_else(|| "isGuardian attribute is missing")?;
    if !is_guardian {
        // TODO: 403 Forbidden
        return Err("user must be a guardian of the dog".into());
    }

    // issues a random invitation ID and stores it to the resource table.
    let invitation_id = generate_id();
    let created_at = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
    let expires_at = created_at + shared_state.duration_of_validity.as_secs();
    tracing::info!("creating invitation {invitation_id}");
    shared_state
        .dynamodb_client
        .put_item()
        .table_name(&shared_state.resource_table_name)
        .item("pk", AttributeValue::S(format!("invitation#{invitation_id}")))
        .item("sk", AttributeValue::S(format!("info")))
        .item("dogId", AttributeValue::S(dog_id))
        .item("createdAt", AttributeValue::N(format!("{created_at}")))
        .item("expiresAt", AttributeValue::N(format!("{expires_at}")))
        .send()
        .await?;
    // TODO: deal with retryable errors

    Ok(Invitation {
        invitation_id,
        payload: CreateInvitationPayload::Issued { expires_at },
    })
}

async fn get_invitation(
    shared_state: Arc<SharedState>,
    GetInvitationParams { user_id, invitation_id }: GetInvitationParams,
) -> Result<Invitation<GetInvitationPayload>, Error> {
    tracing::info!("user {user_id} getting status of invitation {invitation_id}");

    // retrieves the invitation from the resource table.
    let invitation = shared_state
        .dynamodb_client
        .get_item()
        .table_name(&shared_state.resource_table_name)
        .key("pk", AttributeValue::S(format!("invitation#{invitation_id}")))
        .key("sk", AttributeValue::S("info".to_string()))
        .send()
        .await?
        .item
        // TODO: produce a 404 Not Found error
        .ok_or_else(|| format!("no such invitation: {invitation_id}"))?;
    // TODO: deal with retryable errors
    // makes sure that the invitation is still valid
    let expires_at: u64 = invitation
        .get("expiresAt")
        .ok_or_else(|| "expiresAt attribute is missing")
        .and_then(|v| v.as_n().map_err(|_| "expiresAt attribute must be a number"))
        .and_then(|s| s.parse().map_err(|_| "expiresAt attribute is not a valid number"))?;
    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
    if now >= expires_at {
        // TODO: produce a 404 Not Found error
        return Err("invitation has expired".into());
    }

    let dog_id = invitation
        .get("dogId")
        .ok_or_else(|| "dogId attribute is missing")
        .and_then(|v| v.as_s().map_err(|_| "dogId attribute must be a string"))?;

    // obtains the dog name
    let dog = shared_state
        .dynamodb_client
        .get_item()
        .table_name(&shared_state.resource_table_name)
        .key("pk", AttributeValue::S(format!("dog#{dog_id}")))
        .key("sk", AttributeValue::S("info".to_string()))
        .send()
        .await?
        .item
        .ok_or_else(|| format!("no such dog: {dog_id}"))?;
    let dog_name = dog
        .get("name")
        .ok_or_else(|| "name attribute is missing")
        .and_then(|v| v.as_s().map_err(|_| "name attribute must be a string"))?;

    // checks if the user is already a friend of the dog who issued the invitation.
    let relationship = shared_state
        .dynamodb_client
        .get_item()
        .table_name(&shared_state.resource_table_name)
        .key("pk", AttributeValue::S(format!("friend-of#{user_id}")))
        .key("sk", AttributeValue::S(format!("dog#{dog_id}")))
        .send()
        .await?
        .item;
    if relationship.is_none() {
        Ok(Invitation {
            invitation_id,
            payload: GetInvitationPayload::Eligible {
                dog_name: dog_name.clone(),
            },
        })
    } else {
        Ok(Invitation {
            invitation_id,
            payload: GetInvitationPayload::Duplicated {
                dog_id: dog_id.clone(),
            },
        })
    }
}

async fn accept_invitation(
    shared_state: Arc<SharedState>,
    AcceptInvitationParams {
        user_id,
        invitation_id,
    }: AcceptInvitationParams,
) -> Result<Invitation<AcceptInvitationPayload>, Error> {
    tracing::info!("user {user_id} accepting invitation {invitation_id}");

    // pops the invitation from the resource table
    let invitation = shared_state
        .dynamodb_client
        .delete_item()
        .table_name(&shared_state.resource_table_name)
        .key("pk", AttributeValue::S(format!("invitation#{invitation_id}")))
        .key("sk", AttributeValue::S("info".to_string()))
        .return_values(ReturnValue::AllOld)
        .send()
        .await?
        .attributes
        .ok_or_else(|| format!("no such invitation: {invitation_id}"))?;
    // TODO: deal with retryable errors

    // makes sure that the invitation is still valid
    let expires_at: u64 = invitation
        .get("expiresAt")
        .ok_or_else(|| "expiresAt attribute is missing")
        .and_then(|v| v.as_n().map_err(|_| "expiresAt attribute must be a number"))
        .and_then(|s| s.parse().map_err(|_| "expiresAt attribute is not a valid number"))?;
    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
    if now >= expires_at {
        // TODO: produce a 404 Not Found error
        return Err("invitation has expired".into());
    }

    // obtains the dog ID and records the friendship
    // duplicate friendship will fail
    let dog_id = invitation
        .get("dogId")
        .ok_or_else(|| "dogId attribute is missing")
        .and_then(|v| v.as_s().map_err(|_| "dogId attribute must be a string"))?;
    shared_state
        .dynamodb_client
        .put_item()
        .table_name(&shared_state.resource_table_name)
        .item("pk", AttributeValue::S(format!("friend-of#{user_id}")))
        .item("sk", AttributeValue::S(format!("dog#{dog_id}")))
        .item("dogId", AttributeValue::S(dog_id.clone()))
        .item("isGuardian", AttributeValue::Bool(false))
        .item("createdAt", AttributeValue::N(format!("{now}")))
        .condition_expression("attribute_not_exists(pk)")
        .send()
        .await?;
    // TODO: deal with condition check failure → duplicate friendship
    // TODO: deal with retryable errors → 429 Too Many Requests

    Ok(Invitation {
        invitation_id,
        payload: AcceptInvitationPayload::Accepted {
            dog_id: dog_id.clone(),
        },
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
