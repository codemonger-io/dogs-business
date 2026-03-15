import {
  Duration,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import type { CredentialsApi } from '@codemonger-io/passquito-cdk-construct';

import type { DeploymentStage } from './deployment-stage';
import type { MapApi } from './map-api';
import type { ResourceApi } from './resource-api';
import type { CustomDomainNameConfig } from './types';

/** Properties for {@link ApiDistribution}. */
export interface ApiDistributionProps {
  /** Deployment stage. */
  readonly deploymentStage: DeploymentStage;

  /** Dog's Business Resource API. */
  readonly resourceApi: ResourceApi;

  /** Dog's Business Map API. */
  readonly mapApi: MapApi;

  /** Passquito Credentials API. */
  readonly credentialsApi: CredentialsApi;

  /**
   * CORS allowed origins.
   *
   * @remarks
   *
   * No CORS is allowed if omitted or empty.
   */
  readonly allowOrigins?: string[];

  /** Optional custom domain name configuration for the CloudFront distribution. */
  readonly customDomainName?: CustomDomainNameConfig;
}

/**
 * CDK construct that provisions a CloudFront distribution for Dog's Business
 * APIs.
 */
export class ApiDistribution extends Construct {
  /** CloudFront distribution. */
  readonly distribution: cloudfront.IDistribution;

  constructor(scope: Construct, id: string, readonly props: ApiDistributionProps) {
    super(scope, id);

    const {
      allowOrigins,
      credentialsApi,
      customDomainName,
      deploymentStage,
      mapApi,
      resourceApi,
    } = props;

    // cache policy for the Resource API
    const resourceApiCachePolicy = new cloudfront.CachePolicy(
      this,
      'ResourceApiCachePolicy',
      {
        comment: 'cache policy for the Dog\'s Business Resource API',
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          'Authorization',
        ),
        // NOTE: applies the default TTLs. individual API endpoints should set
        // their own Cache-Control headers as needed
        minTtl: Duration.seconds(0), // default but explicitly states that any short TTL is allowed
      },
    );

    // cache policy for the Map API
    const mapApiCachePolicy = new cloudfront.CachePolicy(
      this,
      'MapApiCachePolicy',
      {
        comment: 'cache policy for the Dog\'s Business Map API',
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          'Authorization',
        ),
        minTtl: Duration.minutes(0),
        maxTtl: Duration.minutes(15),
        defaultTtl: Duration.minutes(15),
      },
    );

    // cache policy for the Credentials API
    const credentialsApiCachePolicy = new cloudfront.CachePolicy(
      this,
      'CredentialsApiCachePolicy',
      {
        comment: 'cache policy for the Passquito Credentials API',
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          'Authorization',
        ),
        minTtl: Duration.seconds(0),
        maxTtl: Duration.seconds(1), // we cannot set this to 0 due to validation error
        defaultTtl: Duration.seconds(0),
      },
    );

    // ResponseHeadersPolicy to allow CORS
    const corsHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      'CorsHeadersPolicy',
      {
        comment: 'response headers policy to allow CORS requests to the Dog\'s Business APIs',
        corsBehavior: {
          accessControlAllowHeaders: [
            // wildcard (`*`) won't match Authorization!
            'Authorization',
            '*',
          ],
          accessControlAllowMethods: ['ALL'],
          accessControlAllowOrigins: allowOrigins ?? [],
          accessControlAllowCredentials: false,
          originOverride: true, // overrides API Gateway CORS headers
        },
      },
    );

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Dog\'s Business APIs',
      domainNames: customDomainName != null ? [customDomainName.domainName] : undefined,
      certificate: customDomainName?.certificate,
      // routes to the Resource API by default
      defaultBehavior: {
        origin:  new origins.RestApiOrigin(resourceApi.api),
        cachePolicy: resourceApiCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        responseHeadersPolicy: corsHeadersPolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      },
      additionalBehaviors: {
        [`${mapApi.basePath.replace(/\/$/, '')}/*`]: {
          origin: new origins.RestApiOrigin(mapApi.api),
          cachePolicy: mapApiCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS, // allows preflight OPTIONS
          responseHeadersPolicy: corsHeadersPolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        },
        [`${credentialsApi.basePath.replace(/\/$/, '')}/*`]: {
          origin: new origins.RestApiOrigin(credentialsApi.credentialsApi),
          cachePolicy: credentialsApiCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          responseHeadersPolicy: corsHeadersPolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        },
      },
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: true,
    });
  }

  /**
   * Distribution domain name.
   *
   * @returns
   *
   *   Custom domain name if specified in `props`, otherwise the auto-generated
   *   CloudFront domain name.
   */
  get domainName(): string {
    return this.props.customDomainName?.domainName ?? this.distribution.distributionDomainName;
  }

  /** URL of the Resource API. */
  get resourceApiUrl(): string {
    return `https://${this.domainName}${this.props.resourceApi.basePath}`;
  }

  /** URL of the Map API. */
  get mapApiUrl(): string {
    return `https://${this.domainName}${this.props.mapApi.basePath}`;
  }

  /** URL of the Credentials API. */
  get credentialsApiUrl(): string {
    return `https://${this.domainName}${this.props.credentialsApi.basePath}`;
  }
}
