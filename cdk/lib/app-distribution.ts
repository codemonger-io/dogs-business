import {
  RemovalPolicy,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_iam as iam,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import type { DeploymentStage } from './deployment-stage';
import * as servicePaths from './service-paths';

/** Properties for {@link AppDistribution}. */
export interface AppDistributionProps {
  /**
   * Principal to assume the IAM role that can upload contents to the S3 bucket
   * for distribution.
   *
   * @remarks
   *
   * Supposed to be a federated principal for GitHub OIDC.
   */
  readonly uploaderPrincipal: iam.IPrincipal;

  /** Deployment stage. */
  readonly deploymentStage: DeploymentStage;
}

/**
 * CDK construct that provisions the resources necessary for app contents
 * distribution.
 */
export class AppDistribution extends Construct {
  /**
   * S3 bucket for the contents.
   *
   * @remarks
   *
   * Contents of the app must be stored under the following path:
   * - `/app`
   */
  readonly contentsBucket: s3.Bucket;

  /** CloudFront distribution. */
  readonly distribution: cloudfront.Distribution;

  /** IAM role that can upload contents to the S3 bucket for distribution. */
  readonly uploaderRole: iam.Role;

  constructor(scope: Construct, id: string, props: AppDistributionProps) {
    super(scope, id);

    const { deploymentStage, uploaderPrincipal } = props;

    this.contentsBucket = new s3.Bucket(this, 'ContentsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `Dog's Business App distribution (${deploymentStage})`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.contentsBucket),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      },
      errorResponses: [
        {
          // all the unresolved paths go to the app index so that the SPA works
          // distribution will end up with 403 (not 404) if paths are invalid
          // in the contents bucket
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: servicePaths.appIndex,
        },
      ],
      enableLogging: true,
    });

    this.uploaderRole = new iam.Role(this, 'UploaderRole', {
      description: 'Role to upload contents to the S3 bucket for distribution (${deploymentStage})',
      assumedBy: uploaderPrincipal,
    });
    this.contentsBucket.grantReadWrite(this.uploaderRole);
  }

  /** Internal URL of the distribution. */
  get internalUrl(): string {
    return `https://${this.distribution.distributionDomainName}`;
  }

  /** ARN of the IAM role that can upload contents to the S3 bucket for distribution. */
  get uploaderRoleArn(): string {
    return this.uploaderRole.roleArn;
  }
}
