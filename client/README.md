# Dog's Business Client

The client web app for Dog's Business.
This is a single page application powered by [MapLibre GL JS](https://maplibre.org), [Vue.js](https://vuejs.org), and [Buefy](https://buefy.org/).

## Configurations

You have to configure the environment variables described in the following subsections.
You can find an example configuration in [`.env.example`](./.env.example).

### Generating a configuration file from the CloudFormation stack

**Recommended**

You can generate a configuration file from the CloudFormation stack.
Run the `generate-env` script in the [`cdk`](../cdk) folder to generate a configuration file.

Running the following command in the `cdk` folder generates `.env.development`.

```sh
pnpm generate-env development
```

The following command generates `.env.production`.

```sh
pnpm generate-env production
```

### Configuring the base URL of the Credentials API

You have to configure the environment variable `VITE_CREDENTIALS_API_BASE_URL` to the base URL of the Credentials API.

### Configuring the base URL of the Dog's Business Resource API

You have to configure the environment variable `VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL` to the base URL of the Dog's Business Resource API.

### Configuring the base URL of the Dog's Business Map API

You have to configure the environment variable `VITE_DOGS_BUSINESS_MAP_API_BASE_URL` to the base URL of the Dog's Business Map API.

## Running dev server

1. Configure AWS_PROFILE:

   Example:

    ```sh
    export AWS_PROFILE=dogsbusiness-jp
    ```

2. Configure the RP origin:

    ```sh
    cd ../cdk
    ```

    ```sh
    pnpm set-rp-origin http://localhost:5174
    ```

    ```sh
    cd ../client
    ```

3. Start the dev server:

    ```sh
    pnpm dev
    ```

4. Open `http://localhost:5174` in your browser.

## Unit testing

```sh
pnpm test:unit
```

## Linting

```sh
pnpm lint
```

## Deploying to AWS

You have to deploy the [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) stack first.
Please see the [`/cdk` folder](../cdk) for more details.

1. Choose the deployment stage.

   Development:

    ```sh
    DEPLOYMENT_STAGE=development
    ```

   Production:

    ```sh
    DEPLOYMENT_STAGE=production
    ```

2. Configure AWS_PROFILE:

   Example:

    ```sh
    export AWS_PROFILE=dogsbusiness-jp
    ```

3. Configure the app and the RP origin:

    ```sh
    cd ../cdk
    ```

    ```sh
    pnpm generate-env $DEPLOYMENT_STAGE
    ```

    ```sh
    pnpm set-rp-origin -s $DEPLOYMENT_STAGE
    ```

    ```sh
    cd ../client
    ```

4. Build the bundle:

    ```sh
    pnpm build --mode $DEPLOYMENT_STAGE
    ```

5. Obtain the S3 bucket name:

    ```sh
    CONTENTS_BUCKET_NAME=`aws cloudformation describe-stacks --stack-name dogs-business-$DEPLOYMENT_STAGE --query "Stacks[0].Outputs[?OutputKey=='ContentsBucketName'].OutputValue" --output text`
    ```

6. Copy the contents to the S3 bucket:

    ```sh
    aws s3 sync dist/ s3://$CONTENTS_BUCKET_NAME/app
    ```