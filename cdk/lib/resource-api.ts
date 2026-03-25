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
import { DOG_INDEX_NAME as RECORD_TABLE_DOG_INDEX_NAME } from './business-record-table';
import type { ResourceTable } from './resource-table';
import { DOG_INDEX_NAME as RESOURCE_TABLE_DOG_INDEX_NAME } from './resource-table';
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

  /** Lambda function to update user information. */
  readonly updateUserInfoLambda: lambda.IFunction;

  /** Lambda function to create a new dog. */
  readonly createDogLambda: lambda.IFunction;

  /** Lambda function to get a dog friend. */
  readonly getDogLambda: lambda.IFunction;

  /** Lambda function to create a business record. */
  readonly createBusinessRecordLambda: lambda.IFunction;

  /** Lambda function to get business records. */
  readonly getBusinessRecordsLambda: lambda.IFunction;

  /** Lambda function to get human friends of a dog. */
  readonly getHumanFriendsLambda: lambda.IFunction;

  /** Lambda function to invite a human friend. */
  readonly inviteHumanFriendLambda: lambda.IFunction;

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
      description: 'Obtains the user information',
      manifestPath,
      binaryName: 'get-user-info',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        RESOURCE_TABLE_NAME: resourceTable.table.tableName,
      }
    });
    resourceTable.table.grantReadData(this.getUserInfoLambda);
    // - update user information
    this.updateUserInfoLambda = new RustFunction(this, 'UpdateUserInfoLambda', {
      description: 'Updates the user information',
      manifestPath,
      binaryName: 'update-user-info',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        RESOURCE_TABLE_NAME: resourceTable.table.tableName,
      },
    });
    resourceTable.table.grantReadWriteData(this.updateUserInfoLambda);
    // - create dog
    this.createDogLambda = new RustFunction(this, 'CreateDogLambda', {
      description: 'Creates a new item for a dog friend',
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
      description: 'Obtains the dog friend information',
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
      description: 'Creates a new business record of a dog friend',
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
    // - get business records
    this.getBusinessRecordsLambda = new RustFunction(this, 'GetBusinessRecordsLambda', {
      description: 'Obtains the business records of a dog friend',
      manifestPath,
      binaryName: 'get-business-records',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        RESOURCE_TABLE_NAME: resourceTable.table.tableName,
        BUSINESS_RECORD_TABLE_NAME: businessRecordTable.table.tableName,
        DOG_INDEX_NAME: RECORD_TABLE_DOG_INDEX_NAME,
      },
    });
    resourceTable.table.grantReadData(this.getBusinessRecordsLambda);
    businessRecordTable.table.grantReadData(this.getBusinessRecordsLambda);
    // - get human friends of a dog
    this.getHumanFriendsLambda = new RustFunction(this, 'GetHumanFriendsLambda', {
      description: 'Obtains the human friends of a dog friend',
      manifestPath,
      binaryName: 'get-human-friends',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        RESOURCE_TABLE_NAME: resourceTable.table.tableName,
        DOG_INDEX_NAME: RESOURCE_TABLE_DOG_INDEX_NAME,
        USER_POOL_ID: userPool.userPoolId,
      },
    });
    resourceTable.table.grantReadData(this.getHumanFriendsLambda);
    userPool.grant(this.getHumanFriendsLambda, 'cognito-idp:ListUsers');
    // - invite a human friend
    this.inviteHumanFriendLambda = new RustFunction(this, 'InviteHumanFriendLambda', {
      description: 'Invites a human friend to be a friend of a dog',
      manifestPath,
      binaryName: 'invite-human-friend',
      architecture: lambda.Architecture.ARM_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
      environment: {
        RESOURCE_TABLE_NAME: resourceTable.table.tableName,
      },
    });
    resourceTable.table.grantReadWriteData(this.inviteHumanFriendLambda);

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
      endpointConfiguration: {
        // REGIONAL because the API is intended to be delivered through
        // CloudFront
        types: [apigw.EndpointType.REGIONAL],
      },
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
    const escapedInputParam = (paramName: string) => `"$util.escapeJavaScript($input.params("${paramName}")).replaceAll("\\'","'")"`;
    const mappingTemplateParts = {
      userId: ['userId', '"$context.authorizer.claims["cognito:username"]"'] as KeyValue,
      dogIdSegment: ['dogId', escapedInputParam('dogId')] as KeyValue,
      invitationId: ['invitationId', escapedInputParam('invitationId')] as KeyValue,
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
            responseParameters: {
              // do not cache user information
              'method.response.header.Cache-Control': "'no-store'",
            },
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
            responseParameters: {
              // do not cache user information
              'method.response.header.Cache-Control': true,
            },
          },
        ]),
      },
    );
    // - PATCH
    user.addMethod(
      'PATCH',
      new apigw.LambdaIntegration(this.updateUserInfoLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            mappingTemplateParts.userId,
            ifThen(
              '$input.json("$.activeDogId") != ""',
              [['activeDogId', '$input.json("$.activeDogId")']],
            ),
          ]),
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
          },
        ]),
      }),
      {
        description: 'Update the user information associated with the ID token',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'User information has successfully been updated',
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
        description: 'Create a new business record carried out by the dog friend identified by a given ID token',
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

    // /dog/{dogId}/business-records
    const businessRecords = dogId.addResource('business-records');
    // - GET
    businessRecords.addMethod(
      'GET',
      new apigw.LambdaIntegration(this.getBusinessRecordsLambda, {
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
        description: 'Obtain the business records carried out by a given dog',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'Business records have successfully been obtained',
          },
        ]),
      },
    );

    // /dog/{dogId}/human-friends
    const humanFriends = dogId.addResource('human-friends');
    // - GET
    humanFriends.addMethod(
      'GET',
      new apigw.LambdaIntegration(this.getHumanFriendsLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            mappingTemplateParts.userId,
            mappingTemplateParts.dogIdSegment,
          ])
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
          },
        ]),
      }),
      {
        description: 'Obtain the human friends of a given dog',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'Human friends have successfully been obtained',
          },
        ]),
      },
    );

    // /dog/{dogId}/invitation
    const dogInvitation = dogId.addResource('invitation');
    // - POST
    dogInvitation.addMethod(
      'POST',
      new apigw.LambdaIntegration(this.inviteHumanFriendLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            [
              'create',
              composeMappingTemplate([
                mappingTemplateParts.userId,
                mappingTemplateParts.dogIdSegment,
              ]),
            ],
          ]),
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
          },
        ]),
      }),
      {
        description: 'Invite a human friend to be a friend of a given dog',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'Invitation has successfully been made',
          },
        ]),
      },
    );

    // invitation endpoints
    const invitation = root.addResource('invitation');
    // /invitation/{invitationId}
    const invitationId = invitation.addResource('{invitationId}');
    // - GET
    invitationId.addMethod(
      'GET',
      new apigw.LambdaIntegration(this.inviteHumanFriendLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            [
              'get', composeMappingTemplate([
                mappingTemplateParts.userId,
                mappingTemplateParts.invitationId,
              ]),
            ],
          ]),
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
            responseParameters: {
              // do not cache invitations
              'method.response.header.Cache-Control': "'no-store'",
            },
          },
        ]),
      }),
      {
        description: 'Obtain the invitation identified by a given ID',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'Invitation has successfully been obtained',
            responseParameters: {
              // do not cache invitations
              'method.response.header.Cache-Control': true,
            },
          },
        ]),
      },
    );
    // - POST
    invitationId.addMethod(
      'POST',
      new apigw.LambdaIntegration(this.inviteHumanFriendLambda, {
        proxy: false,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': composeMappingTemplate([
            [
              'accept', composeMappingTemplate([
                mappingTemplateParts.userId,
                mappingTemplateParts.invitationId,
              ])
            ],
          ]),
        },
        integrationResponses: makeIntegrationResponsesAllowCors([
          {
            statusCode: '200',
          },
        ]),
      }),
      {
        description: 'Accept the invitation identified by a given ID',
        authorizer,
        authorizationType: apigw.AuthorizationType.COGNITO,
        methodResponses: makeMethodResponsesAllowCors([
          {
            statusCode: '200',
            description: 'Invitation has successfully been accepted',
          },
        ]),
      },
    );
  }

  /** Base path of the API. */
  get basePath(): string {
    return this.props.basePath;
  }

  /** Internal URL of the Dog's Business Resource API. */
  get internalUrl(): string {
    return this.api.urlForPath(this.props.basePath);
  }
}
