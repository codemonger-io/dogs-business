import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
} from '@aws-sdk/client-ssm';
import type { DeploymentStage } from './deployment-stage';
import { PARAMETER_NAME_PREFIX} from './ssm-parameters';

/**
 * Configuration parameters stored in AWS Systems Manager (SSM) Parameter Store.
 *
 * @beta
 */
export interface SsmConfigParams {
  /**
   * Custom domain name for app distribution.
   *
   * @remarks
   *
   * `undefined` if no custom domain name is configured.
   */
  readonly appDistributionCustomDomainName?: string;

  /**
   * Custom domain name for Dog's Business API distribution.
   *
   * @remarks
   *
   * `undefined` if no custom domain name is configured.
   */
  readonly apiDistributionCustomDomainName?: string;

  /**
   * ARN of the certificate to protect the distirbutions.
   *
   * @remarks
   *
   * `undefined` if no certificate is configured.
   */
  readonly distributionCertificateArn?: string;
}

/**
 * Obtains configuration parameters for a given deployment stage from SSM
 * Parameter Store.
 *
 * @beta
 */
export async function getSsmConfigParams(
  deploymentStage: DeploymentStage,
): Promise<SsmConfigParams> {
  const parameterNameBase = `${PARAMETER_NAME_PREFIX}${deploymentStage}`;
  return {
    appDistributionCustomDomainName: await getValueFromParameterStore(
      `${parameterNameBase}/APP_DISTRIBUTION_CUSTOM_DOMAIN_NAME`,
    ),
    apiDistributionCustomDomainName: await getValueFromParameterStore(
      `${parameterNameBase}/API_DISTRIBUTION_CUSTOM_DOMAIN_NAME`,
    ),
    distributionCertificateArn: await getValueFromParameterStore(
      `${parameterNameBase}/DISTRIBUTION_CERTIFICATE_ARN`,
    ),
  };
}

/**
 * Obtains a value from SSM Parameter Store.
 *
 * @remarks
 *
 * Returns `undefined` if the parameter does not exist.
 *
 * @beta
 */
async function getValueFromParameterStore(
  parameterName: string,
): Promise<string | undefined> {
  const ssmClient = new SSMClient({});
  try {
    const response = await ssmClient.send(new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true, // may not be encrypted, but it does not hurt
    }));
    return response.Parameter?.Value;
  } catch (err) {
    if (err instanceof ParameterNotFound) {
      return undefined;
    }
    throw err;
  }
}
