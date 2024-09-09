import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as s3 from 'aws-cdk-lib/aws-s3';

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
        const alb = new elbv2.ApplicationLoadBalancer(this, 'app-alb', {
            vpc,
            internetFacing: true,
            vpcSubnets: {
                subnets: [
                    ec2.Subnet.fromSubnetId(this, 'PublicSubnet1', publicSubnet1),
                    ec2.Subnet.fromSubnetId(this, 'PublicSubnet2', publicSubnet2),
                ],
            },
        });
        // Create an S3 bucket for ALB logs
        const albLogBucket = new s3.Bucket(this, 'alb-logs', {
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            lifecycleRules: [
                {
                    expiration: cdk.Duration.days(60),
                },
            ],
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            versioned: true,
        });
        // Access the underlying CfnLoadBalancer resource
        const cfnAlb = alb.node.defaultChild as elbv2.CfnLoadBalancer;
        // Set the LoadBalancerAttributes
        cfnAlb.loadBalancerAttributes = [
            {
                key: 'access_logs.s3.bucket',
                value: albLogBucket.bucketName,
            },
            {
                key: 'access_logs.s3.enabled',
                value: 'true',
            },
            {
                key: 'routing.http.drop_invalid_header_fields.enabled',
                value: 'true',
            },
        ];

        // Enable access logging for the ALB
        alb.logAccessLogs(albLogBucket);
    }
}
