# Dog's Business CDK

Provisions AWS resources for Dog's Business.
All the AWS resources are described with [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/).

## Setting AWS_PROFILE

Please configure your [`AWS_PROFILE`](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html) environment variable.
Here is an example in my case:

```sh
export AWS_PROFILE=dogsbusiness-jp
```

## Configuring toolkit stack name

You can choose any toolkit stack name you like, or leave it as default.
Here is an example in my case:

```sh
TOOLKIT_STACK_NAME=dogs-business-toolkit
```

## Configuring bootstrap qualifier

I strongly recommend setting a non-default bootstrap qualifier if you choose a custom toolkit stack name.
Please refer to <https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-custom-synth> for more details.
Here is an example in my case:

```sh
export BOOTSTRAP_QUALIFIER=dogsbz2023
```

## Bootstrapping

You have to bootstrap the toolkit stack if you have not done it yet.
Remove `--toolkit-stack-name $TOOLKIT_STACK_NAME` option if you choose the default toolkit stack name.

```sh
pnpm cdk bootstrap --toolkit-stack-name $TOOLKIT_STACK_NAME --qualifier $BOOTSTRAP_QUALIFIER
```

## Synthesizing CloudFormation template

You have to [configure the `BOOTSTRAP_QUALIFIER` environment](#configuring-bootstrap-qualifier) variable prior to synthesizing the CloudFormation template.

**Development:**

```sh
pnpm cdk-synth
```

**Production:**

```sh
pnpm cdk-synth:production
```

## Deploying

You have to [configure the `BOOTSTRAP_QUALIFIER` environment](#configuring-bootstrap-qualifier) variable prior to deploying the CDK stack(s).

**Development:**

```sh
pnpm cdk-deploy
```

**Production:**

```sh
pnpm cdk-deploy:production
```

## Post deployment

Replace `$DEPLOYMENT_STAGE` with "development" or "production" as needed.

For development:

```sh
DEPLOYMENT_STAGE=development
```

For production:

```sh
DEPLOYMENT_STAGE=production
```

### Obtaining the internal URL of the distribution

```sh
aws cloudformation describe-stacks --stack-name dogs-business-$DEPLOYMENT_STAGE --query "Stacks[0].Outputs[?OutputKey=='AppDistributionInternalUrl'].OutputValue" --output text
```

### Name of the S3 bucket for the contents

```sh
aws cloudformation describe-stacks --stack-name dogs-business-$DEPLOYMENT_STAGE --query "Stacks[0].Outputs[?OutputKey=='ContentsBucketName'].OutputValue" --output text
```

### Configuring the Relying Party origin

You have to configure the [(Webauthn) Relying Party](https://www.w3.org/TR/webauthn-3/#relying-party) origin to conduct passkey registration and authentication.
It is stored in the Parameter Store of AWS Systems Manager.

You can run the following command to configure the URL of the default CloudFront distribution as the Relying Party origin:

```sh
pnpm set-rp-origin
```

For production,

```sh
pnpm set-rp-origin -s production
```

If you are locally testing the server, you can run:

```sh
pnpm set-rp-origin http://localhost:5174
```

You can also check the parameter name for the Relying Party with the following command:

```sh
aws cloudformation describe-stacks --stack-name dogs-business-$DEPLOYMENT_STAGE --query "Stacks[0].Outputs[?OutputKey=='RelyingPartyOriginParameterPath'].OutputValue" --output text
```