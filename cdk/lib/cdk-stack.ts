import {
  Arn,
  CfnOutput,
  Stack,
  aws_certificatemanager as acm,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
} from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { PassquitoCore } from '@codemonger-io/passquito-cdk-construct';

import { BusinessRecordTable } from './business-record-table';
import type { DeploymentStage } from './deployment-stage';
import { ApiDistribution } from './api-distribution';
import { AppDistribution } from './app-distribution';
import { MapApi } from './map-api';
import { ELIGIBLE_OIDC_SUB_CLAIMS } from './oidc-config';
import { ResourceApi } from './resource-api';
import { ResourceTable } from './resource-table';
import { SessionTable } from './session-table';
import { SsmParameters } from './ssm-parameters';
import { StackReader } from './stack-reader';

export interface CdkStackProps extends StackProps {
  /** Deployment stage. */
  readonly deploymentStage: DeploymentStage;

  /**
   * Domain name of the CloudFront distribution for the app contents.
   *
   * @remarks
   *
   * Used to configure CORS.
   * You may leave this empty at the first deployment.
   */
  readonly appDistributionDomainName?: string;

  /**
   * Optional custom domain name of the CloudFront distribution for the app
   * contents.
   *
   * @remarks
   *
   * You have to specify {@link distributionCertificateArn} if this property is
   * specified.
   */
  readonly appDistributionCustomDomainName?: string;

  /**
   * Optional custom domain name of the CloudFront distribution for the Dog's
   * Business APIs.
   *
   * @remarks
   *
   * You have to specify {@link distributionCertificateArn} if this property is
   * specified.
   */
  readonly apiDistributionCustomDomainName?: string;

  /**
   * ARN of the certificate to protect the CloudFront distribution.
   *
   * @remarks
   *
   * You may leave this `undefined` if you do not configure the CloudFront
   * distribution to use a custom domain name.
   */
  readonly distributionCertificateArn?: string;
}

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    const {
      apiDistributionCustomDomainName,
      appDistributionCustomDomainName,
      appDistributionDomainName,
      deploymentStage,
      distributionCertificateArn,
    } = props;
    const isProduction = deploymentStage === 'production';

    if ((appDistributionCustomDomainName != null || apiDistributionCustomDomainName != null) && distributionCertificateArn == null) {
      throw new RangeError('custom domain name is specified but missing distribution certificate ARN');
    }

    const localhostOrigins = isProduction ? [] : [
      'http://localhost:5174',
      'http://localhost:4173',
    ];
    const allowOrigins = [
      ...(appDistributionCustomDomainName ? [`https://${appDistributionCustomDomainName}`] : []),
      ...(appDistributionDomainName ? [`https://${appDistributionDomainName}`] : []),
      ...localhostOrigins,
    ];

    const distributionCertificateRef = distributionCertificateArn != null
      ? acm.CfnCertificate.fromCertificateId(
        this,
        'DistributionCertificate',
        distributionCertificateArn,
      )
      : undefined;

    // `FederatedPrincipal` turns into `sts:AssumeRole`
    // but we need `sts:AssumeRoleWithWebIdentity`
    // so the right choice is `WebIdentityPrincipal`
    const githubOidcPricinpal = new iam.WebIdentityPrincipal(
      Arn.format(
        {
          service: 'iam',
          region: '',
          resource: 'oidc-provider',
          // GitHub OIDC provider is supposed to have this resource name
          resourceName: 'token.actions.githubusercontent.com',
        },
        this,
      ),
      {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': ELIGIBLE_OIDC_SUB_CLAIMS,
        },
      },
    );

    const passquito = new PassquitoCore(this, 'Passquito', {
      ssmParametersProps: {
        group: 'dogs-business',
        config: deploymentStage,
      },
      allowOrigins,
      billingForSessionTable: dynamodb.Billing.onDemand(isProduction
        ? {
          // TODO: monitor capacity usage to determine appropirate caps
          maxReadRequestUnits: 20,
          maxWriteRequestUnits: 20,
        }
        : {
          maxReadRequestUnits: 2,
          maxWriteRequestUnits: 2,
        }),
      billingForCredentialTable: dynamodb.Billing.onDemand(isProduction
        ? {
          // TODO: monitor capacity usage to determine appropriate caps
          maxReadRequestUnits: 20,
          maxWriteRequestUnits: 20,
        }
        : {
          maxReadRequestUnits: 2,
          maxWriteRequestUnits: 2,
        }),
    });
    const ssmParameters = new SsmParameters(this, 'SsmParameters', {
      deploymentStage,
    });
    const resourceTable = new ResourceTable(this, 'ResourceTable', {
      deploymentStage,
    });
    const sessionTable = new SessionTable(this, 'SessionTable', {
      deploymentStage,
    });
    const businessRecordTable = new BusinessRecordTable(this, 'BusinessRecordTable', {
      deploymentStage,
    });
    const resourceApi = new ResourceApi(this, 'ResourceApi', {
      basePath: '/dogs-business-api/resource',
      allowOrigins,
      resourceTable,
      businessRecordTable,
      userPool: passquito.userPool.userPool,
      ssmParameters,
    })
    const mapApi = new MapApi(this, 'MapApi', {
      basePath: '/dogs-business-api/map',
      allowOrigins,
      businessRecordTable,
      sessionTable,
      userPool: passquito.userPool.userPool,
      tileAccessTokenSecretParameter: ssmParameters.tileAccessTokenSecretParameter,
    });
    const apiDistribution = new ApiDistribution(this, 'ApiDistribution', {
      resourceApi,
      mapApi,
      allowOrigins,
      customDomainName: apiDistributionCustomDomainName != null ? {
        domainName: apiDistributionCustomDomainName,
        certificate: distributionCertificateRef!,
      } : undefined,
      deploymentStage,
    });
    const appDistribution = new AppDistribution(this, 'AppDistribution', {
      uploaderPrincipal: githubOidcPricinpal,
      customDomainName: appDistributionCustomDomainName != null ? {
        domainName: appDistributionCustomDomainName,
        certificate: distributionCertificateRef!,
      } : undefined,
      deploymentStage,
    });
    const stackReader = new StackReader(this, 'StackReader', {
      assumedBy: githubOidcPricinpal,
    });

    new CfnOutput(this, 'MapboxAccessTokenParameterPath', {
      description: 'SSM parameter path for the Mapbox access token for online accounts',
      value: ssmParameters.mapboxAccessTokenParameterPath,
    });
    new CfnOutput(this, 'TileAccessTokenSecretParameterPath', {
      description: 'SSM parameter path for the secret key to sign tile access tokens',
      value: ssmParameters.tileAccessTokenSecretParameterPath,
    });
    new CfnOutput(this, 'AppDistributionDomainName', {
      description: 'Domain name of the CloudFront distribution for the app contents',
      value: appDistribution.distribution.domainName,
    });
    new CfnOutput(this, 'AppDistributionInternalUrl', {
      description: 'Internal URL of the app distribution',
      value: appDistribution.internalUrl,
    });
    new CfnOutput(this, 'DogsBusinessResourceApiInternalUrl', {
      description: "Internal URL of the Dog's Business Resource API",
      value: apiDistribution.resourceApiUrl,
    });
    new CfnOutput(this, 'DogsBusinessMapApiInternalUrl', {
      description: "Internal URL of the Dog's Business Map API",
      value: apiDistribution.mapApiUrl,
    });
    new CfnOutput(this, 'ContentsBucketName', {
      description: 'Name of the S3 bucket for the contents',
      value: appDistribution.contentsBucket.bucketName,
    });
    new CfnOutput(this, 'RelyingPartyOriginParameterPath', {
      description: 'SSM parameter path for the relying party origin for the Passkey authentication',
      value: passquito.rpOriginParameterPath,
    });
    new CfnOutput(this, 'CredentialsApiInternalUrl', {
      description: 'Internal (API Gateway) URL of the credentials API',
      value: passquito.credentialsApiInternalUrl,
    });
    new CfnOutput(this, 'StackReaderRoleArn', {
      description: 'ARN of the IAM role that can read (describe) this stack. Use for CI/CD.',
      value: stackReader.roleArn,
    });
    new CfnOutput(this, 'ContentsUploaderRoleArn', {
      description: 'ARN of the IAM role that can upload contents to the S3 bucket for the app distribution',
      value: appDistribution.uploaderRoleArn,
    });
  }
}
