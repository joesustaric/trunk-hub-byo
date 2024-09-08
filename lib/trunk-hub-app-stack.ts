import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

interface TrunkHubAppStackProps extends cdk.StackProps {
    vpcStackName: string;
}
export class TrunkHubAppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: TrunkHubAppStackProps) {
        super(scope, id, props);

        //Import values needed from VPC Stack Outputs
        const vpcId = cdk.Fn.importValue(`${props.vpcStackName}:VpcId`);
        const publicSubnet1 = cdk.Fn.importValue(`${props.vpcStackName}:PublicSubnet1`);
        const publicSubnet2 = cdk.Fn.importValue(`${props.vpcStackName}:PublicSubnet2`);
        const az1 = cdk.Fn.importValue(`${props.vpcStackName}:AvailabilityZone1`);
        const az2 = cdk.Fn.importValue(`${props.vpcStackName}:AvailabilityZone2`);

        // Import the VPC using the imported VPC ID and availability zones
        const vpc = ec2.Vpc.fromVpcAttributes(this, 'ImportedVPC', {
            vpcId: vpcId,
            availabilityZones: [az1, az2],
            publicSubnetIds: [publicSubnet1, publicSubnet2],
        });

        // Create an Application Load Balancer
        // TODO: ALB Logs to and s3 Bucket
        new elbv2.ApplicationLoadBalancer(this, 'trunk-hub-alb', {
            vpc,
            internetFacing: true,
            vpcSubnets: {
                subnets: [
                    ec2.Subnet.fromSubnetId(this, 'PublicSubnet1', publicSubnet1),
                    ec2.Subnet.fromSubnetId(this, 'PublicSubnet2', publicSubnet2),
                ],
            },
        });

        // Create a security group
        // const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
        //     vpc,
        //     description: 'Allow HTTPS and Git protocol traffic',
        //     allowAllOutbound: true,
        // });
        // Add ingress rules for IPv4
        // securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic for Git commands');
        // securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(9418), 'Allow Git protocol traffic');

        // Add ingress rules for IPv6
        // securityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(443), 'Allow HTTPS traffic for Git commands');
        // securityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(9418), 'Allow Git protocol traffic');

        // Create an Auto Scaling Group with two instances
        // const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
        //     vpc,
        //     instanceType: new ec2.InstanceType('t2.micro'),
        //     machineImage: new ec2.AmazonLinuxImage(),
        //     minCapacity: 2,
        //     maxCapacity: 2,
        //     vpcSubnets: {
        //         subnets: [
        //             ec2.Subnet.fromSubnetId(this, 'PublicSubnet1', publicSubnet1),
        //             ec2.Subnet.fromSubnetId(this, 'PublicSubnet2', publicSubnet2),
        //         ],
        //     },
        //     securityGroup: securityGroup,
        // });
    }
}
