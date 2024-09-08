#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TrunkHubVPCStack } from '../lib/trunk-hub-vpc-stack';
import { TrunkHubAppStack } from '../lib/trunk-hub-app-stack';
import { Tags } from 'aws-cdk-lib';

const app = new cdk.App();

// Define environment configurations
const devEnv = { account: '872676544639', region: 'ap-southeast-2' };
const prodEnv = { account: '872676544639', region: 'ap-southeast-2' };

// Function to apply tags to a stack
function applyTags(stack: cdk.Stack, tags: { [key: string]: string }) {
  for (const [key, value] of Object.entries(tags)) {
    Tags.of(stack).add(key, value);
  }
}

// Tags for dev and prod environments
const commonTags = {
  system: 'trunk-hub',
  'test:foo': 'bar'
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
  vpcStackName: 'trunk-hub-vpc-dev'
});
applyTags(devAppStack, devTags);

// Instantiate the stack for the prod environment
const prodAppStack = new TrunkHubAppStack(app, 'trunk-hub-app-prod', {
  vpcStackName: 'trunk-hub-vpc-prod'
});
applyTags(prodAppStack, devTags);

//Ack Warnings
cdk.Annotations.of(devAppStack).acknowledgeWarning("@aws-cdk/aws-ec2:noSubnetRouteTableId");
cdk.Annotations.of(prodAppStack).acknowledgeWarning("@aws-cdk/aws-ec2:noSubnetRouteTableId");
