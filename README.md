# TrunkHub CDK

Build a run your own Git Server in the cloud that does not accept PRs.

## TODOS
- [ ] xx

## Changelog
This project uses a CHANGELOG.md file to keep track of changes.
Based on the [Keep a Changelog](https://keepachangelog.com) format.

## Useful commands

* `npx cdk bootstrap aws://<acc-number>/<region>` cdk bootstrap
* `npx cdk list`    list stacks
* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Security

Using `checkov` for security scanning.

```bash
# Install checkov
brew install checkov
# Run checkov
checkov
```
There is a configuration file in the root of the project with all the options for checkov to run.

### Handy checkov commands

Create baseline, the file will do into `cdk.out` directory.
The checkov configuration file points to the `.checkov.baseline` file in the root of the project.

```bash
checkov --create-baseline --output-baseline-as-skipped -d cdk.out
```

## Recording ADRS

We use [adr-tools](https://github.com/npryce/adr-tools) to record our Architecture Decision Records (ADRs).

More context on ADRs please read [this](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
