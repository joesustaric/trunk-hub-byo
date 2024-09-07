#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TrunkHubByoStack } from '../lib/trunk-hub-byo-stack';
import { Tags } from 'aws-cdk-lib';
import { CheckovValidator } from '@bridgecrew/cdk-validator-checkov'

const app = new cdk.App({
  context: {
    policyValidationBeta1: [
      new CheckovValidator(),
    ],
    context: {
      '@aws-cdk/core:validationReportJson': true,
    }
  },
});

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
  system: 'TrunkHubByo',
};

const devTags = {
  ...commonTags,
  environment: 'development',
};

const prodTags = {
  ...commonTags,
  environment: 'production',
};

// Instantiate the stack for the dev environment
const devStack = new TrunkHubByoStack(app, 'TrunkHubByoStackDev', { env: devEnv });
applyTags(devStack, devTags);

// Instantiate the stack for the prod environment
const prodStack = new TrunkHubByoStack(app, 'TrunkHubByoStackProd', { env: prodEnv });
applyTags(prodStack, prodTags);
