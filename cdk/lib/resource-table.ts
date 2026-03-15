import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import type { DeploymentStage } from './deployment-stage';

/**
 * Properties for {@link ResourceTable}.
 *
 * @beta
 */
export interface ResourceTableProps {
  deploymentStage: DeploymentStage;
}

/**
 * CDK construct which provisions a DynamoDB table for resources.
 *
 * @beta
 */
export class ResourceTable extends Construct {
  /**
   * Table for resources.
   *
   * @remarks
   *
   * ## Table structure
   *
   * Primary keys:
   * - `pk`: (string) partition key
   * - `sk`: (string) sort key
   *
   * Time to live (TTL) attribute:
   * - `expiresAt`: (timestamp) time of expiration
   *
   * ### Common types
   *
   * - `timestamp`: (number) timestamp represented as the number of seconds
   *   elapsed since 00:00:00 on January 1, 1970 UTC.
   *
   * ### Users
   *
   * - `pk`: "user#{userId}"
   *   - `userId`: unique user ID
   * - `sk`: "info"
   * - `activeDogId`: (string, optional) ID of the user's active dog friend
   * - `consistencyToken`: (string) token for ensuring data consistency
   * - `createdAt`: (timestamp) time of creation
   * - `updatedAt`: (timestamp) time of last update
   *
   * ### Dogs
   *
   * - `pk`: "dog#{dogId}"
   *   - `dogId`: unique dog ID
   * - `sk`: "info"
   * - `name`: (string) dog name
   * - `createdAt`: (timestamp) time of creation
   * - `updatedAt`: (timestamp) time of last update
   *
   * ### Relationships
   *
   * - `pk`: "friend-of#{userId}"
   *   - `userId`: unique user ID
   * - `sk`: "dog#{dogId}"
   *   - `dogId`: unique dog ID
   * - `isGuardian`: (boolean) whether the user is a guardian of the dog
   * - `createdAt`: (timestamp) time of creation
   *
   * ### Invitations
   *
   * - `pk`: "invitation#{invitationId}"
   *   - `invitationId`: unique invitation ID
   * - `sk`: "info"
   * - `dogId`: unique ID of the dog who issued the invitation
   * - `createdAt`: (timestamp) time of creation
   * - `expiresAt`: (timestamp) time of expiration
   */
  readonly table: dynamodb.ITableV2;

  constructor(scope: Construct, id: string, props: ResourceTableProps) {
    super(scope, id);

    const { deploymentStage } = props;
    const isProduction = deploymentStage === 'production';

    this.table = new dynamodb.TableV2(this, 'ResourceTable', {
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: 'expiresAt',
      billing: dynamodb.Billing.onDemand(isProduction
        ? {
          // TODO: monitor the capacity usage and adjust the caps accordingly
          maxReadRequestUnits: 20,
          maxWriteRequestUnits: 20,
        }
        : {
          maxReadRequestUnits: 2,
          maxWriteRequestUnits: 2,
        }),
      // TODO: enable point-in-time recovery for production
    });
  }
}
