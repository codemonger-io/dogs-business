# dogs-business-ops

A CloudFormation template that defines resources necessary to operate Dog's Business and its development.
It utilizes features of AWS Serverless Application Model (SAM), though, is essentially a simple CloudFormation template.

## Development

### Configuring AWS profile

Please configure your [`AWS_PROFILE`](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html) environment variable.
Here is an example in my case:

```sh
export AWS_PROFILE=dogsbusiness-jp
```

### Configuring the project

Copy `samconfig.toml.example` as `samconfig.toml` and edit it.

To deploy AWS resources from your GitHub repository, you have to configure the following parameters:
- `CdEligibleGitHubRefs`: comma separated GitHub repository ref patterns which you allow to assume the IAM role to manipulate your AWS resources

  Example: `repo:codemonger-io/dogs-business:ref:refs/heads/main,repo:codemonger-io/dogs-business:ref:refs/heads/gha-*`
  - `repo:codemonger-io/dogs-business:ref:refs/heads/main`: grants the `main` branch of the repository [`codemonger-io/dogs-business`](https://github.com/codemonger-io/dogs-business) to manipulate AWS resources
  - `repo:codemonger-io/dogs-business:ref:refs/heads/gha-*`: grants branches with the name starting with `gha-` of the repository [`codemonger-io/dogs-business`](https://github.com/codemonger-io/dogs-business) to manipulate AWS resources

  ⚠️ **Misconfiguration could compromise the security of your AWS account.** ⚠️

- `DistributionDomainName`: (optional) domain name for the CloudFront distribution.
  Creation of an AWS Certificate Manager (ACM) certificate is requested if this parameter is not empty.
  Subdomains of the specified domain name will be also protected with the cretificate.
  No certificate will be requested if omitted or left empty.

  Example: `dogsbusiness.codemonger.io`

- `StackNamePrefix`: (optional) prefix of the names for the CloudFormation stacks that provision core resources.
  `"dogs-business"` by default.

### Building the CloudFormation template

```sh
sam build
```

### Deploying the CloudFormation stack

```sh
sam deploy
```

Note that the stack is deployed to the `us-east-1` region regardless of the region associated with your AWS profile because it contains a request to ACM for a public certificate.
Region does not matter to IAM resources that the stack provisions.

#### DNS validation for the public certificate

After running the `deploy` command, you have to create CNAME records in your DNS database.
Otherwise, your stack creation will be stuck in the `CREATE_IN_PROGRESS` state.

Ignore this section if you do not specify the `DistributionDomainName` parameter.