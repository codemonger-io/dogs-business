//! Authorize a map tile request.
//!
//! ## Environment variables
//!
//! You have to configure the following environment variable:
//! - `TILE_ACCESS_TOKEN_SECRET_PARAMETER_PATH`: Path to the secret key to verify the tile
//!   access token, that is stored in AWS Systems Manager (SSM) Parameter Store.
//!
//! ## Input
//!
//! See [`ApiGatewayCustomAuthorizerRequestTypeRequest`](https://docs.rs/aws_lambda_events/latest/aws_lambda_events/event/apigw/struct.ApiGatewayCustomAuthorizerRequestTypeRequest.html).
//!
//! ## Output
//!
//! See [`ApiGatewayCustomAuthorizerResponse`](https://docs.rs/aws_lambda_events/latest/aws_lambda_events/event/apigw/struct.ApiGatewayCustomAuthorizerResponse.html).

use aws_lambda_events::{
    apigw::{
        ApiGatewayCustomAuthorizerRequestTypeRequest,
        ApiGatewayCustomAuthorizerResponse,
    },
    http::HeaderName,
    iam::{IamPolicyEffect, IamPolicyStatement},
};
use base64::{engine::general_purpose::STANDARD as base64_engine, Engine as _};
use hmac::{Hmac, Mac as _};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use sha2::Sha256;
use std::env;
use std::sync::Arc;
use std::time::SystemTime;

use map_auth::{
    ByteArrayExt as _,
    TileAccessTokenBytes,
    TileAccessTokenBytesExt as _,
};

/// Shared state that lives while the Lambda instance is alive.
struct SharedState {
    /// Secret key to verify the tile access token.
    secret_key: String,
}

impl SharedState {
    /// Creates a new `SharedState`.
    async fn new() -> Result<Self, Error> {
        // lodas the secret key from SSM Parameter Store
        let secret_key_path = env::var("TILE_ACCESS_TOKEN_SECRET_PARAMETER_PATH")
            .map_err(|_| "TILE_ACCESS_TOKEN_SECRET_PARAMETER_PATH env is not set")?;
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let ssm_client = aws_sdk_ssm::Client::new(&config);
        let secret_key = ssm_client
            .get_parameter()
            .name(secret_key_path)
            .with_decryption(true)
            .send()
            .await?
            .parameter
            .and_then(|p| p.value)
            .ok_or_else(|| "no secret for tile access tokens stored in the Parameter Store")?;

        Ok(Self {
            secret_key,
        })
    }
}

// `HeaderName` for "Authorization".
const AUTHORIZATION_HEADER: HeaderName = HeaderName::from_static("authorization"); // must be in lower case

// Authorization header prefix for Bearer tokens.
const BEARER_PREFIX: &[u8] = b"Bearer ";

async fn function_handler(
    shared_state: Arc<SharedState>,
    event: LambdaEvent<ApiGatewayCustomAuthorizerRequestTypeRequest>,
) -> Result<ApiGatewayCustomAuthorizerResponse, Error> {
    tracing::info!("authorizing tile request: method={:?}, path={:?}", event.payload.http_method, event.payload.path);

    let mut response = ApiGatewayCustomAuthorizerResponse::default();
    response.principal_id = Some("user".to_string());

    // extracts the authorization header
    let auth_header = event
        .payload
        .headers
        .get(&AUTHORIZATION_HEADER);
    if auth_header.is_none() {
        tracing::warn!("missing authorization header");
    }
    let token = auth_header
        .and_then(|v| v.as_bytes().strip_prefix(BEARER_PREFIX));
    if token.is_none() {
        tracing::warn!("invalid authorization header. must start with 'Bearer '");
    }

    // validates the token
    tracing::info!("validating token: {:?}", token);
    let is_valid = token
        .ok_or_else(|| ())
        // decodes the Base64-encoded token → token_bytes
        .and_then(|token| {
            if !TileAccessTokenBytes::validate_base64_encoded_length(token.len()) {
                tracing::warn!("invalid Base64-encoded token length: {}", token.len());
                return Err(());
            }
            let mut token_bytes = TileAccessTokenBytes::zeros();
            base64_engine
                .decode_slice(token, &mut token_bytes)
                .map_err(|e| {
                    tracing::warn!("invalid Base64-encoded token: {e}");
                    ()
                })
                .and_then(|len| {
                    if len != token_bytes.len() {
                        tracing::warn!("invalid decoded token length: {len}");
                        return Err(());
                    }
                    Ok(token_bytes)
                })
        })
        // validates the token signature
        .and_then(|token_bytes| {
            let (expires_at, signature) = token_bytes.get_parts();
            let mut mac = Hmac::<Sha256>::new_from_slice(shared_state.secret_key.as_bytes())
                .map_err(|e| {
                    tracing::error!("wrong secret key configuration: {e}");
                    ()
                })?;
            mac.update(&expires_at);
            mac.verify_slice(&signature)
                .map_err(|e| {
                    tracing::error!("invalid token signature: {e}");
                    ()
                })?;
            Ok(u64::from_be_bytes(expires_at))
        })
        // validates the expiration time
        .map(|expires_at| {
            let now = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .expect("UNIX time should be valid")
                .as_secs();
            now < expires_at
        })
        .is_ok_and(|validity| validity);

    // configures the policy
    let policy_document = &mut response.policy_document;
    policy_document.version = Some("2012-10-17".to_string());
    if is_valid && let Some(method_arn) = &event.payload.method_arn {
        tracing::info!("parsing method_arn: {}", method_arn);
        // method_arn should end with /{z}/{x}/{y}/tile.mvt
        let tile_root_arn = method_arn
            .rsplit_once('/')
            .and_then(|(base, _mvt)| base.rsplit_once('/'))
            .and_then(|(base, _y)| base.rsplit_once('/'))
            .and_then(|(base, _x)| base.rsplit_once('/'))
            .map(|(tile, _z)| tile);
        if tile_root_arn.is_some_and(|arn| arn.ends_with("/tile")) {
            let tile_root_arn = tile_root_arn.unwrap();
            tracing::info!("granting access to arn: {}/*", tile_root_arn);
            let mut statement = IamPolicyStatement::default();
            statement.effect = IamPolicyEffect::Allow;
            statement.action.push("execute-api:Invoke".to_string());
            statement.resource.push(format!("{tile_root_arn}/*"));
            policy_document.statement.push(statement);
        } else {
            tracing::warn!("invalid method_arn pattern: {method_arn}");
            policy_document.statement.push(make_deny_all_statement());
        }
    } else {
        policy_document.statement.push(make_deny_all_statement());
    }

    Ok(response)
}

// creates a policy statement that denies all access.
fn make_deny_all_statement() -> IamPolicyStatement {
    let mut statement = IamPolicyStatement::default();
    statement.effect = IamPolicyEffect::Deny;
    statement.action.push("*".to_string());
    statement.resource.push("*".to_string());
    statement
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
