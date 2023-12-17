import { type Node } from 'constructs';

/** Possible deployment stages. */
export const DEPLOYMENT_STAGES = ['development', 'production'] as const;

/** Deployment stage. */
export type DeploymentStage = typeof DEPLOYMENT_STAGES[number];

/** Name of the CDK context variable that specifies the deployment stage. */
export const DEPLOYMENT_STAGE_CONTEXT = 'dogs-business:deployment-stage';

/**
 * Tests if a given value is a {@link DeploymentStage}.
 *
 * @remarks
 *
 * `value` is narrowed to {@link DeploymentStage} if this function returns
 * `true`.
 */
export function isDeploymentStage(value: unknown): value is DeploymentStage {
  return DEPLOYMENT_STAGES.includes(value as DeploymentStage);
}

/**
 * Returns the deployment stage of a given {@link Node}.
 *
 * @remarks
 *
 * Reads the deployment stage from the CDK context variable
 * "dogs-business:deployment-stage".
 *
 * @throws Error
 *
 *   If no deployment stage is configured for `node`.
 *
 * @throws RangeError
 *
 *   If the configured deployment stage is not valid.
 */
export function getDeploymentStage(node: Node): DeploymentStage {
  const deploymentStage = node.tryGetContext(DEPLOYMENT_STAGE_CONTEXT);
  if (deploymentStage == null) {
    throw new Error('no deployment stage is configured');
  }
  if (!isDeploymentStage(deploymentStage)) {
    throw new RangeError(`invalid deployment stage: ${deploymentStage}`);
  }
  return deploymentStage;
}
