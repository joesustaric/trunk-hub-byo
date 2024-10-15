# TrunkHub CDK

Build a run your own Git Server in the cloud that only accepts default (trunk/main) branch pushes.

No web interface, just a robust git server hosted in the cloud.

## TODOS
- [ ] Code linting
- [x] EFS for shared storage
- [ ] Backup EFS to S3
- [ ] Figure out how to do configure a push hook to trigger something
- [ ] use https://fck-nat.dev/v1.3.0/ instead of managed NAT

# Stacks
## trunk-hub-vpc-dev|prod
This is a AWS VPC based of the CDK VPC construct in CDK. It is a simple VPC with 2 public and 2 private subnets. It is configured for Session Manager access including the necessary rules to allow the AWS Session Manager to connect to private and public instances.

If you have a VPC already you can use that instead of creating a new one. You will need to provide the required VPC inputs.

TODO: Architecture Diagram and VPC outputs needed for the App stack.

## trunk-hub-app-dev|prod

This is the main stack that creates the configuration to host the git server. It creates the following resources:
- EC2 instance with the git server installed (Amazon Linux 2)
- Network Load Balancer
- S3 Bucket for backups / logging
- EFS for shared storage

TODO: Architecture Diagram and how to define the VPC inputs if not using the VPC stack.

### SSH Keys

To ensure the host keys stay the same no matter which EC2 instance you ssh to, you will need to regenerate several keys and upload them to the SSM Parameter Store.

TODO: Add instructions on how to generate the keys and upload them to the SSM Parameter Store.

## Changelog
This project uses a CHANGELOG.md file to keep track of changes.
Based on the [Keep a Changelog](https://keepachangelog.com) format.

## Useful Commands

* `npx cdk bootstrap aws://<acc-number>/<region>` cdk bootstrap
* `npx cdk list`    list stacks
* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Connecting to servers from command line
The VPC the app is deployed into should alow for AWS Session Manager to be used to connect to the servers.

See [AWS Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html) and [VPC Setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html).

If you have the aws cli installed you may need to install the session manager plugin.

```bash
# For MacOS
brew install session-manager-plugin

# To connect
aws ssm start-session --target your-instance-id
```

For other operating systems please see the [AWS Session Manager Plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

## Security

Using `checkov` for security scanning.

```bash
# Install checkov
brew install checkov
# Run checkov
checkov
```
There is a configuration file in the root of the project with all the options for checkov to run.

### Checkov Exceptions

TODO: how to add exceptions to checkov

### Handy checkov commands

The configuration file should have all the options ready to go.

Just run:

```bash
checkov
```

To trigger all the security checks.

Create baseline, the file will do into `cdk.out` directory.
The checkov configuration file points to the `.checkov.baseline` file in the root of the project.

```bash
checkov --create-baseline --output-baseline-as-skipped -d cdk.out
```
## Skipping a check

There is a `.checkov.skip` file in the root of the project that contains the checks that are skipped. You can regenerate the file by running the following command:

```bash
checkov --create-checkov-skip-file #recheck this
```

## Recording ADRS

We use [adr-tools](https://github.com/npryce/adr-tools) to record our Architecture Decision Records (ADRs).

More context on ADRs please read [this](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
