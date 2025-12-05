/**
 * OIDC sub claims eligible for accessing and manipulating the AWS resources.
 *
 * @remarks
 *
 * **You MUST replace this configuration for your own repository and branches.**
 *
 * Supposed to be a GitHub repository refs like:
 * "repo:codemonger-io/dogs-business:ref:refs/heads/main"
 *
 * You may include wildcards (`*`):
 * "repo:codemonger-io/dogs-business:ref:refs/heads/gha-*"
 *
 * @beta
 */
export const ELIGIBLE_OIDC_SUB_CLAIMS = [
  'repo:codemonger-io/dogs-business:ref:refs/heads/main',
  'repo:codemonger-io/dogs-business:ref:refs/heads/gha-*',
] as const;
