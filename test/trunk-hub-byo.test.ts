import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as TrunkHubByo from '../lib/trunk-hub-vpc-stack';

test('VPC is created with expected resources', () => {
	// Given
	const app = new cdk.App();

	// WHEN
	const stack = new TrunkHubByo.TrunkHubVPCStack(app, 'MyTestStack', {
		vpcCidr: '10.0.0.0/16',
	});

  	// THEN
	const template = Template.fromStack(stack);

	// Assert that a VPC is created
	template.hasResourceProperties('AWS::EC2::VPC', {
		CidrBlock: '10.0.0.0/16',
	});

	// Assert that public subnets are created
	// Find and count public subnets
    const publicSubnets = template.findResources('AWS::EC2::Subnet', {
        Properties: {
            MapPublicIpOnLaunch: true,
        },
    });
    expect(Object.keys(publicSubnets).length).toBe(2);

	 // Find and count private subnets
	const privateSubnets = template.findResources('AWS::EC2::Subnet', {
        Properties: {
            MapPublicIpOnLaunch: false,
        },
    });
    expect(Object.keys(privateSubnets).length).toBe(2);

	// Assert that an Internet Gateway is created and attached
	template.resourceCountIs('AWS::EC2::InternetGateway', 1);
	template.resourceCountIs('AWS::EC2::VPCGatewayAttachment', 1);

	// Assert that NAT Gateways are created
	template.resourceCountIs('AWS::EC2::NatGateway', 2);

	// Assert that route tables are created and associated with subnets
	template.resourceCountIs('AWS::EC2::RouteTable', 4);
	template.resourceCountIs('AWS::EC2::SubnetRouteTableAssociation', 4);

	// Assert that the VPC has the correct tags
	template.hasResourceProperties('AWS::EC2::VPC', {
	Tags: [
		{
			Key: 'Name',
			Value: 'MyTestStack/trunk-hub-vpc',
		},
	],
	});

	// Assert that the az's are outputted
	template.hasOutput('PublicSubnet1', {
		Description: 'ID of public subnet 1',
	});
	template.hasOutput('PublicSubnet2', {
		Description: 'ID of public subnet 2',
	});
});

test('VPC is created with the stack correct outputs', () => {
	// Given
	const app = new cdk.App();

	// WHEN
	const stack = new TrunkHubByo.TrunkHubVPCStack(app, 'MyTestStack', {
		vpcCidr: '10.0.0.0/16',
	});

	// THEN
	const template = Template.fromStack(stack);

	// Assert that the VPC ID is in the output
	template.hasOutput('VpcId', {
		Description: 'ID of the VPC',
	});

	// Assert that the public subnet IDs are output
	template.hasOutput('PublicSubnet1', {
		Description: 'ID of public subnet 1',
	});
	template.hasOutput('PublicSubnet2', {
		Description: 'ID of public subnet 2',
	});

	// Assert that the private subnet IDs are output
	template.hasOutput('PrivateSubnet1', {
		Description: 'ID of private subnet 1',
	});
	template.hasOutput('PrivateSubnet2', {
		Description: 'ID of private subnet 2',
	});
});
