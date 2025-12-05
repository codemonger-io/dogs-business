import { Arn, Stack, aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Properties for {@link StackReader}.
 *
 * @beta
 */
export interface StackReaderProps {
  /**
   * Principal to assume the IAM role.
   *
   * @remarks
   *
   * Supposed to be a federated principal for GitHub OIDC.
   */
  assumedBy: iam.IPrincipal;
}

// GitHub

/**
 * CDK construct which provisions an IAM role to read (describe) this stack.
 *
 * @remarks
 *
 * The principal intended to assume the role is GitHub Actions via OIDC.
 *
 * @beta
 */
export class StackReader extends Construct {
  /** the IAM role. */
  private role: iam.IRole;

  constructor(scope: Construct, id: string, props: StackReaderProps) {
    super(scope, id);

    const { assumedBy } = props;

    this.role = new iam.Role(this, 'Role', {
      description: "Role to read (describe) the Dog's Business CloudFormation stack",
      assumedBy,
      inlinePolicies: {
        DescribeStack: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['cloudformation:DescribeStacks'],
              resources: [
                Arn.format(
                  {
                    service: 'cloudformation',
                    resource: 'stack',
                    resourceName: `${Stack.of(this).stackName}/*`,
                  },
                  Stack.of(this),
                )
              ],
            }),
          ],
        }),
      },
    });
  }

  /** ARN of the IAM role to read (describe) this stack. */
  get roleArn(): string {
    return this.role.roleArn;
  }
}
