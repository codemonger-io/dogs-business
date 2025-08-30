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
   * - `sk`: "dog#{dogId}"
   * - `isGuardian`: (boolean) whether the user is a guardian of the dog
   * - `createdAt`: (timestamp) time of creation
   */
  readonly table: dynamodb.ITableV2;

  constructor(scope: Construct, id: string, props: ResourceTableProps) {
    super(scope, id);

    this.table = new dynamodb.TableV2(this, 'ResourceTable', {
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      // TODO: on-demand for production
      billing: dynamodb.Billing.provisioned({
        readCapacity: dynamodb.Capacity.fixed(2),
        writeCapacity: dynamodb.Capacity.autoscaled({
          maxCapacity: 2,
        }),
      }),
      // TODO: enable point-in-time recovery for production
    });
  }
}
