import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
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

    // Assert that the ALB has access logging enabled to an S3 bucket
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        LoadBalancerAttributes: Match.arrayWith([
            Match.objectLike({
                Key: 'access_logs.s3.enabled',
                Value: 'true',
            }),
            Match.objectLike({
                Key: 'access_logs.s3.bucket',
                Value: Match.anyValue(), // You can specify the exact bucket name if needed
            }),
        ]),
    });
});

