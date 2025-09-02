import * as path from 'node:path';
import {
  Duration,
  aws_apigateway as apigw,
  aws_cognito as cognito,
  aws_lambda as lambda,
} from 'aws-cdk-lib'
import { RustFunction } from 'cargo-lambda-cdk';
import { Construct } from 'constructs';
import {
  makeIntegrationResponsesAllowCors,
  makeMethodResponsesAllowCors,
} from '@codemonger-io/cdk-cors-utils';
import { RestApiWithSpec, augmentAuthorizer } from '@codemonger-io/cdk-rest-api-with-spec';
import type { KeyValue } from '@codemonger-io/mapping-template-compose';
import { composeMappingTemplate, ifThen } from '@codemonger-io/mapping-template-compose';

import type { BusinessRecordTable } from './business-record-table';
import type { ResourceTable } from './resource-table';
import type { SsmParameters } from './ssm-parameters';

/**
 * Props for {@link ResourceApi}.
 *
 * @beta
 */
export interface ResourceApiProps {
  /** Base path. */
  readonly basePath: string;

  /**
   * Allowed origins.
   *
   * @remarks
   *
   * No CORS preflight is performed if empty.
   */
  readonly allowOrigins: string[];

  /** Resource table. */
  readonly resourceTable: ResourceTable;

  /** Business record table. */
  readonly businessRecordTable: BusinessRecordTable;

  /** User pool for authentication. */
  readonly userPool: cognito.UserPool;

  /** Parameters in AWS Systems Manager Parameter Store. */
  readonly ssmParameters: SsmParameters;
}

/**
 * CDK construct that provisions the Dog's Business Resource API.
 *
 * @beta
 */
export class ResourceApi extends Construct {
  /** Lambda function to obtain user information. */
  readonly getUserInfoLambda: lambda.IFunction;

  /** Lambda function to create a new dog. */
  readonly createDogLambda: lambda.IFunction;

  /** Lambda function to get a dog friend. */
  readonly getDogLambda: lambda.IFunction;

  /** Lambda function to create a business record. */
  readonly createBusinessRecordLambda: lambda.IFunction;

  /** API Gateway REST API. */
  readonly api: RestApiWithSpec;

  constructor(scope: Construct, id: string, readonly props: ResourceApiProps) {
    super(scope, id);

    const {
      allowOrigins,
      basePath,
      businessRecordTable,
      ssmParameters,
      resourceTable,
      userPool,
    } = props;
    const manifestPath = path.join('lambda', 'resource-api', 'Cargo.toml');

    // Lambda functions
    // - get user information
    this.getUserInfoLambda = new RustFunction(this, 'GetUserInfoLambda', {
      manifestPath,
      binaryName: 'get-user-info',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        MAPBOX_ACCESS_TOKEN_PARAMETER_PATH: ssmParameters.mapboxAccessTokenParameterPath,
      }
    });
    ssmParameters.mapboxAccessTokenParameter.grantRead(this.getUserInfoLambda);
    // - create dog
    this.createDogLambda = new RustFunction(this, 'CreateDogLambda', {
      manifestPath,
      binaryName: 'create-dog',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        RESOURCE_TABLE_NAME: resourceTable.table.tableName,
      },
    });
    resourceTable.table.grantReadWriteData(this.createDogLambda);
    // - get dog information
    this.getDogLambda = new RustFunction(this, 'GetDogLambda', {
      manifestPath,
      binaryName: 'get-dog',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        RESOURCE_TABLE_NAME: resourceTable.table.tableName,
      },
    });
    resourceTable.table.grantReadData(this.getDogLambda);
    // - create business record
    this.createBusinessRecordLambda = new RustFunction(this, 'CreateBusinessRecordLambda', {
      manifestPath,
      binaryName: 'create-business-record',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        RESOURCE_TABLE_NAME: resourceTable.table.tableName,
        BUSINESS_RECORD_TABLE_NAME: businessRecordTable.table.tableName,
      },
    });
    resourceTable.table.grantReadData(this.createBusinessRecordLambda);
    businessRecordTable.table.grantReadWriteData(this.createBusinessRecordLambda);

    // REST API
    this.api = new RestApiWithSpec(this, 'ResourceApi', {
      description: "Dog's Business Resource API",
      openApiInfo: {
        version: '0.1.0',
      },
      openApiOutputPath: path.join('openapi', 'resource-api.json'),
      defaultCorsPreflightOptions: allowOrigins.length > 0 ? {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET', 'POST'],
        allowOrigins,
        maxAge: Duration.days(1),
      } : undefined,
      deploy: true,
      deployOptions: {
        description: 'Default deployment',
        stageName: 'default',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        // TODO: determine proper limits
        throttlingRateLimit: 100,
        throttlingBurstLimit: 100,
        tracingEnabled: true,
      },
    });

    // suppresses CORS errors caused when the gateway responds with errors
    // before reaching the integrations
    if (allowOrigins.length > 0) {
      this.api.addGatewayResponse('Unauthorized', {
        type: apigw.ResponseType.DEFAULT_4XX,
        responseHeaders: {
          'Access-Control-Allow-Origin': "'*'",
        },
      });
      this.api.addGatewayResponse('InternalServerError', {
        type: apigw.ResponseType.DEFAULT_5XX,
        responseHeaders: {
          'Access-Control-Allow-Origin': "'*'",
        },
      });
    }

    // user pool authorizer
    const authorizer = augmentAuthorizer(
      new apigw.CognitoUserPoolsAuthorizer(this, 'UserPoolAuthorizer', {
        cognitoUserPools: [userPool],
      }),
      {
        description: 'Authorizer that authenticates users by ID tokens issued by the Cognito user pool',
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
      },
    );

    // building blocks for mapping templates
    const mappingTemplateParts = {
      userId: ['userId', '"$context.authorizer.claims["cognito:username"]"'] as KeyValue,
      dogIdSegment: ['dogId', `"$util.escapeJavaScript($input.params("dogId")).replaceAll("\\'","'")"`] as KeyValue,
    };

    // gets to the base path
    const root = basePath
      .split('/')
      .filter((p) => p.length > 0)
      .reduce(
        (resource, part) => resource.addResource(part),
        this.api.root,
      );

    // user endpoints
    const user = root.addResource('user');
    // /user
    // - GET
    user.addMethod(
      'GET',
      new apigw.LambdaIntegration(this.getUserInfoLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            ['userId', '"$context.authorizer.claims["cognito:username"]"'],
          ]),
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
          },
        ]),
      }),
      {
        description: 'Obtain the user information associated with the ID token',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'User information has successfully been obtained',
          },
        ]),
      },
    );

    // dog endpoints
    const dog = root.addResource('dog');
    // /dog
    // - POST
    dog.addMethod(
      'POST', 
      new apigw.LambdaIntegration(this.createDogLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            mappingTemplateParts.userId,
            ['name', '$input.json("$.name")'],
          ]),
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
          },
        ]),
      }),
      {
        description: 'Create a new dog friend for the user associated with the ID token',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'New dog friend has successfully been created',
          },
        ]),
      },
    );
    // /dog/{dogId}
    const dogId = dog.addResource('{dogId}');
    // - GET
    dogId.addMethod(
      'GET',
      new apigw.LambdaIntegration(this.getDogLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            mappingTemplateParts.userId,
            mappingTemplateParts.dogIdSegment,
          ]),
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
          },
        ]),
      }),
      {
        description: 'Obtain the dog friend identified by a given ID for the user associated with the ID token',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'Dog friend has successfully been obtained',
          },
        ]),
      },
    );
    // /dog/{dogId}/business-record
    const businessRecord = dogId.addResource('business-record');
    // - POST
    businessRecord.addMethod(
      'POST',
      new apigw.LambdaIntegration(this.createBusinessRecordLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            mappingTemplateParts.userId,
            mappingTemplateParts.dogIdSegment,
            ['businessType', '$input.json("$.businessType")'],
            ['location', '$input.json("$.location")'],
          ]),
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
          },
        ]),
      }),
      {
        description: 'Create a new business record carried out by the dog friend identified by a given ID',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'Business record has successfully been created',
          },
        ]),
      },
    );
  }

  /** Internal URL of the Dog's Business Resource API. */
  get internalUrl(): string {
    return this.api.urlForPath(this.props.basePath);
  }
}
