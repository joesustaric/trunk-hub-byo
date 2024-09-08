import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as TrunkHubByo from '../lib/trunk-hub-app-stack';

test('App Server Config is correct', () => {
    // Given
	const app = new cdk.App();

    // WHEN
	const stack = new TrunkHubByo.TrunkHubAppStack(app, 'MyTestStack', {
		vpcStackName: 'test-vpc-stack',
	});
    const template = Template.fromStack(stack);

    // THEN
        // Assert that there is one ALB created
        template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);

});

