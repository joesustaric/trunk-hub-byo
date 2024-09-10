import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as TrunkHubByo from '../lib/trunk-hub-app-stack';

test('App Server Config is correct', () => {
    // Given
	const app = new cdk.App();
    const envArgs = { region: 'ap-southeast-2' };

    // WHEN
	const stack = new TrunkHubByo.TrunkHubAppStack(app, 'MyTestStack', {
		vpcStackName: 'test-vpc-stack',
        env: envArgs
	});
    const template = Template.fromStack(stack);

    // THEN
    // Assert that there is one ALB created
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);

    // Assert that the ALB has access logging enabled to an S3 bucket
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        LoadBalancerAttributes: Match.arrayWith([
            Match.objectLike({
                Key: 'access_logs.s3.bucket',
                Value: Match.anyValue(),
            }),
            Match.objectLike({
                Key: 'access_logs.s3.enabled',
                Value: 'true',
            }),
        ]),
    });

    // Assert that there is one Auto Scaling Group created
    template.resourceCountIs('AWS::AutoScaling::AutoScalingGroup', 1);

    // Assert that the Auto Scaling Group has 2 instances
    template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
        DesiredCapacity: '2',
        MinSize: '2',
        MaxSize: '2',
    });

    // // Assert that the Target Group is correctly configured
    // template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    //     TargetType: 'instance',
    //     VpcId: { 'Fn::ImportValue': 'test-vpc-stack:VpcId' },
    // });

    // // Assert that the ALB listener is forwarding traffic to the target group
    // template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    //     DefaultActions: Match.arrayWith([
    //         Match.objectLike({
    //             TargetGroupArn: Match.anyValue(),
    //             Type: 'forward',
    //         }),
    //     ]),
    // });
});

