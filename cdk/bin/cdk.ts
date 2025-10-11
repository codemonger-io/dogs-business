#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import { DEPLOYMENT_STAGES } from '../lib/deployment-stage';
import { getStackOutputs } from '../lib/stack-outputs';

const app = new cdk.App();
for (const deploymentStage of DEPLOYMENT_STAGES) {
  getStackOutputs(deploymentStage)
    .then((stackOutputs) => {
      new CdkStack(app, `dogs-business-${deploymentStage}`, {
        env: {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: process.env.CDK_DEFAULT_REGION,
        },
        deploymentStage,
        appDistributionDomainName: stackOutputs?.appDistributionDomainName,
        tags: {
          deploymentStage,
          project: 'dogs-business',
        },
      });
    });
}
