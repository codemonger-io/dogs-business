//! Authorize a map tile request.
//!
//! ## Environment variables
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
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use std::sync::Arc;

/// Shared state that lives while the Lambda instance is alive.
struct SharedState {
}

impl SharedState {
    /// Creates a new `SharedState`.
    async fn new() -> Result<Self, Error> {
        Ok(Self {})
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
    // TODO: validate token
    tracing::info!("extracted token: {:?}", token);
    let is_valid = token.is_some();
    if !is_valid {
        tracing::warn!("invalid authorization token");
    }

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
