import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';

import type { DeploymentStage } from './deployment-stage';

/**
 * Dog's Business CloudFormation stack outputs.
 *
 * @beta
 */
export interface StackOutputs {
  /** Domain name of the CloudFront distribution for the app contents. */
  appDistributionDomainName?: string;

  /** SSM parameter path for the relying party origin. */
  rpOriginParameterPath?: string;

  /** Internal URL of the Credentials API. */
  credentialsApiInternalUrl?: string;

  /** Internal URL of the Dog's Business Resource API. */
  resourceApiInternalUrl?: string;

  /** Internal URL of the Dog's Business Map API. */
  mapApiInternalUrl?: string;
}

const STACK_OUTPUT_MAP: { [key: string]: keyof StackOutputs } = {
  AppDistributionDomainName: 'appDistributionDomainName',
  RelyingPartyOriginParameterPath: 'rpOriginParameterPath',
  CredentialsApiInternalUrl: 'credentialsApiInternalUrl',
  DogsBusinessResourceApiInternalUrl: 'resourceApiInternalUrl',
  DogsBusinessMapApiInternalUrl: 'mapApiInternalUrl',
} as const;

/**
 * Obtains the stack outputs of a given deployment stage.
 *
 * @beta
 *
 * @returns
 *
 *   Stack outputs, or `null` if the stack does not exist.
 */
export async function getStackOutputs(
  deploymentStage: DeploymentStage,
): Promise<StackOutputs | undefined> {
  const stackName = `dogs-business-${deploymentStage}`;
  const client = new CloudFormationClient({});
  const command = new DescribeStacksCommand({ StackName: stackName });
  try {
    const res = await client.send(command);
    const stacks = res.Stacks;
    const stack = stacks?.[0];
    const outputs = stack?.Outputs;
    if (outputs == null) {
      return undefined;
    }
    console.log('found the CloudFormation stack:', stackName)
    const resultOutputs: StackOutputs = {};
    for (const key in STACK_OUTPUT_MAP) {
      const value = outputs.find((o) => o.OutputKey === key)?.OutputValue;
      resultOutputs[STACK_OUTPUT_MAP[key]] = value;
    }
    return resultOutputs;
  } catch (err) {
    // stack does not exist, or configuration errors
    console.warn('have you deployed the CloudFormation stack?', stackName);
    return undefined;
  }
}
