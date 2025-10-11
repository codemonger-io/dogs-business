import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { PassquitoCore } from '@codemonger-io/passquito-cdk-construct';

import { BusinessRecordTable } from './business-record-table';
import type { DeploymentStage } from './deployment-stage';
import { ApiDistribution } from './api-distribution';
import { AppDistribution } from './app-distribution';
import { MapApi } from './map-api';
import { ResourceApi } from './resource-api';
import { ResourceTable } from './resource-table';
import { SsmParameters } from './ssm-parameters';

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
}

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    const { appDistributionDomainName, deploymentStage } = props;

    const allowOrigins = [
      ...(appDistributionDomainName ? [`https://${appDistributionDomainName}`] : []),
      'http://localhost:5174',
    ];

    const passquito = new PassquitoCore(this, 'Passquito', {
      ssmParametersProps: {
        group: 'dogs-business',
        config: deploymentStage,
      },
      allowOrigins,
    });
    const ssmParameters = new SsmParameters(this, 'SsmParameters', {
      deploymentStage,
    });
    const resourceTable = new ResourceTable(this, 'ResourceTable', {
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
      userPool: passquito.userPool.userPool,
    });
    const apiDistribution = new ApiDistribution(this, 'ApiDistribution', {
      resourceApi,
      mapApi,
      allowOrigins,
      deploymentStage,
    });
    const appDistribution = new AppDistribution(this, 'AppDistribution', {
      deploymentStage,
    });

    new CfnOutput(this, 'MapboxAccessTokenParameterPath', {
      description: 'SSM parameter path for the Mapbox access token for online accounts',
      value: ssmParameters.mapboxAccessTokenParameterPath,
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
  }
}
