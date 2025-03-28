#!/usr/bin/env node
import 'source-map-support/register';
import { Tags } from 'aws-cdk-lib';
import { TrunkHubAppStack } from '../lib/trunk-hub-app-stack';
import { TrunkHubBackupStack } from '../lib/trunk-hub-backup-stack';
import { TrunkHubVPCStack } from '../lib/trunk-hub-vpc-stack';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();

// Define environment configurations

const devEnv = { account: process.env.AWS_ACCOUNT_ID, region: 'ap-southeast-2' };
const prodEnv = { account: process.env.AWS_ACCOUNT_ID, region: 'ap-southeast-2' };

// Function to apply tags to a stack
function applyTags(stack: cdk.Stack, tags: { [key: string]: string }) {
  for (const [key, value] of Object.entries(tags)) {
    Tags.of(stack).add(key, value);
  }
}

// Tags for dev and prod environments
const commonTags = {
  system: 'trunk-hub',
};

const devTags = {
  ...commonTags,
  environment: 'dev',
};

const prodTags = {
  ...commonTags,
  environment: 'prod',
};

// VPC
// Instantiate the stack for the dev environment
const devStack = new TrunkHubVPCStack(app, 'trunk-hub-vpc-dev', {
  env: devEnv,
  vpcCidr: '10.0.0.0/16',
  description: 'Dev environment VPC stack for TrunkHub',
});
applyTags(devStack, devTags);

// Instantiate the stack for the prod environment
const prodStack = new TrunkHubVPCStack(app, 'trunk-hub-vpc-prod', {
  env: prodEnv,
  vpcCidr: '10.0.0.0/16',
  description: 'Prod environment VPC stack for TrunkHub',
});
applyTags(prodStack, prodTags);

// APP
// Instantiate the stack for the dev environment
const devAppStack = new TrunkHubAppStack(app, 'trunk-hub-app-dev', {
  vpcStackName: 'trunk-hub-vpc-dev',
  description: 'Dev environment stack for TrunkHub App',
  env: devEnv
});
applyTags(devAppStack, devTags);

// Instantiate the stack for the prod environment
const prodAppStack = new TrunkHubAppStack(app, 'trunk-hub-app-prod', {
  vpcStackName: 'trunk-hub-vpc-prod',
  description: 'Prod environment stack for TrunkHub App',
  env: prodEnv
});
applyTags(prodAppStack, prodTags);

// Backup
// Instantiate the stack for the dev environment
const devBackupStack = new TrunkHubBackupStack(app, 'trunk-hub-backup-dev', {
  appStackName: 'trunk-hub-app-dev',
  description: 'Dev environment stack for TrunkHub Backup',
  env: devEnv
});
applyTags(devBackupStack, devTags);

// Instantiate the stack for the prod environment
const prodBackupStack = new TrunkHubBackupStack(app, 'trunk-hub-backup-prod', {
  appStackName: 'trunk-hub-app-prod',
  description: 'Prod environment stack for TrunkHub Backup',
  env: prodEnv
});
applyTags(prodBackupStack, prodTags);

//Ack Warnings
cdk.Annotations.of(prodAppStack).acknowledgeWarning("@aws-cdk/aws-ec2:noSubnetRouteTableId");
cdk.Annotations.of(prodAppStack).acknowledgeWarning("@aws-cdk/aws-autoscaling:desiredCapacitySet")
cdk.Annotations.of(devAppStack).acknowledgeWarning("@aws-cdk/aws-ec2:noSubnetRouteTableId");
cdk.Annotations.of(devAppStack).acknowledgeWarning("@aws-cdk/aws-autoscaling:desiredCapacitySet")
