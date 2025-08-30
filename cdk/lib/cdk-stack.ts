import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { PassquitoCore } from '@codemonger-io/passquito-cdk-construct';

import type { DeploymentStage } from './deployment-stage';
import { Distribution } from './distribution';
import { MapApi } from './map-api';
import { ResourceApi } from './resource-api';
import { ResourceTable } from './resource-table';
import { SsmParameters } from './ssm-parameters';

export interface CdkStackProps extends StackProps {
  /** Deployment stage. */
  readonly deploymentStage: DeploymentStage;
}

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    const { deploymentStage } = props;

    const passquito = new PassquitoCore(this, 'Passquito', {
      ssmParametersProps: {
        group: 'dogs-business',
        config: deploymentStage,
      },
      allowOrigins: ['http://localhost:5174'],
    });
    const ssmParameters = new SsmParameters(this, 'SsmParameters', {
      deploymentStage,
    });
    const resourceTable = new ResourceTable(this, 'ResourceTable', {
      deploymentStage,
    });
    const resourceApi = new ResourceApi(this, 'ResourceApi', {
      basePath: '/dogs-business-api/resource',
      allowOrigins: ['http://localhost:5174'],
      resourceTable,
      userPool: passquito.userPool.userPool,
      ssmParameters,
    })
    const mapApi = new MapApi(this, 'MapApi', {
      basePath: '/dogs-business-api/map',
      allowOrigins: ['http://localhost:5174'],
      userPool: passquito.userPool.userPool,
    });
    const distribution = new Distribution(this, 'Distribution', {
      deploymentStage,
    });

    new CfnOutput(this, 'MapboxAccessTokenParameterPath', {
      description: 'SSM parameter path for the Mapbox access token for online accounts',
      value: ssmParameters.mapboxAccessTokenParameterPath,
    });
    new CfnOutput(this, 'DistributionInternalUrl', {
      description: 'Internal URL of the distribution',
      value: distribution.internalUrl,
    });
    new CfnOutput(this, 'DogsBusinessResourceApiInternalUrl', {
      description: "Internal URL of the Dog's Business Resource API",
      value: resourceApi.internalUrl,
    });
    new CfnOutput(this, 'DogsBusinessMapApiInternalUrl', {
      description: "Internal URL of the Dog's Business Map API",
      value: mapApi.internalUrl,
    });
    new CfnOutput(this, 'ContentsBucketName', {
      description: 'Name of the S3 bucket for the contents',
      value: distribution.contentsBucket.bucketName,
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
