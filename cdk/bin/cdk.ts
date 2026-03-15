#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import { DEPLOYMENT_STAGES } from '../lib/deployment-stage';
import { getSsmConfigParams } from '../lib/ssm-config-params';
import { getStackOutputs } from '../lib/stack-outputs';

const app = new cdk.App();
for (const deploymentStage of DEPLOYMENT_STAGES) {
  getStackOutputs(deploymentStage)
    .then(async (stackOutputs) => ({
      stackOutputs,
      ssmConfigParams: await getSsmConfigParams(deploymentStage),
    }))
    .then(({ stackOutputs, ssmConfigParams }) => {
      new CdkStack(app, `dogs-business-${deploymentStage}`, {
        env: {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: process.env.CDK_DEFAULT_REGION,
        },
        deploymentStage,
        appDistributionDomainName: stackOutputs?.appDistributionDomainName,
        appDistributionCustomDomainName: ssmConfigParams.appDistributionCustomDomainName,
        apiDistributionCustomDomainName: ssmConfigParams.apiDistributionCustomDomainName,
        distributionCertificateArn: ssmConfigParams.distributionCertificateArn,
        tags: {
          deploymentStage,
          project: 'dogs-business',
        },
      });
    });
}
