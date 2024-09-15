import { Construct } from 'constructs';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';

interface TrunkHubAppStackProps extends cdk.StackProps {
    vpcStackName: string;
}
export class TrunkHubAppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: TrunkHubAppStackProps) {
        super(scope, id, props);

        //Import values needed from VPC Stack Outputs
        //TODO: or pass these in?
        const az1 = cdk.Fn.importValue(`${props.vpcStackName}:AvailabilityZone1`);
        const az2 = cdk.Fn.importValue(`${props.vpcStackName}:AvailabilityZone2`);
        const privateSubnet1 = cdk.Fn.importValue(`${props.vpcStackName}:PrivateSubnet1`);
        const privateSubnet2 = cdk.Fn.importValue(`${props.vpcStackName}:PrivateSubnet2`);
        const publicSubnet1 = cdk.Fn.importValue(`${props.vpcStackName}:PublicSubnet1`);
        const publicSubnet2 = cdk.Fn.importValue(`${props.vpcStackName}:PublicSubnet2`);
        const vpcId = cdk.Fn.importValue(`${props.vpcStackName}:VpcId`);

        // Import the VPC using the imported VPC ID and availability zones
        const vpc = ec2.Vpc.fromVpcAttributes(this, 'ImportedVPC', {
            availabilityZones: [az1, az2],
            privateSubnetIds: [privateSubnet1, privateSubnet2],
            publicSubnetIds: [publicSubnet1, publicSubnet2],
            vpcId: vpcId,
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

        // Set alb attributes
        alb.setAttribute('access_logs.s3.bucket', albLogBucket.bucketName)
        alb.setAttribute('access_logs.s3.enabled', 'true')
        alb.setAttribute('routing.http.drop_invalid_header_fields.enabled', 'true')

        // Enable access logging for the ALB
        alb.logAccessLogs(albLogBucket);

        // Create an IAM role for EC2 Instance Connect
        const ec2InstanceConnectRole = new iam.Role(this, 'EC2InstanceConnectRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('EC2InstanceConnect')
            ],
        });

        const securityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
            allowAllOutbound: true,
            vpc,
        });
        securityGroup.addIngressRule(
            ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access'
        );
        securityGroup.addIngressRule(
            ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow http access'
        );

        // User data script to set up a web server
        const userData = ec2.UserData.forLinux();
        userData.addCommands(
            'yum update -y',
            'yum install -y httpd',
            'systemctl enable httpd',
            'systemctl start httpd',
        );

        // Create an Auto Scaling group
        const autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
            blockDevices: [{
                deviceName: '/dev/xvda', // Root volume
                volume: autoscaling.BlockDeviceVolume.ebs(8, {
                    volumeType: autoscaling.EbsDeviceVolumeType.GP3,
                    encrypted: true,
                    deleteOnTermination: true,
                }),
            },],
            desiredCapacity: 2,
            instanceType: new ec2.InstanceType('t4g.micro'),
            machineImage: new ec2.AmazonLinuxImage({
                cpuType: ec2.AmazonLinuxCpuType.ARM_64,
                edition: ec2.AmazonLinuxEdition.STANDARD,
                generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
                storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
                virtualization: ec2.AmazonLinuxVirt.HVM,
            }),
            maxCapacity: 2,
            minCapacity: 2,
            role: ec2InstanceConnectRole,
            securityGroup: securityGroup,
            userData: userData,
            vpc,
            vpcSubnets: {
                subnets: vpc.privateSubnets,
            },
        });

        // // Attach the Auto Scaling group to the ALB
        const listener = alb.addListener('Listener', {
            port: 80,
            open: true,
        });
        
        listener.addTargets('Targets', {
            port: 80,
            targets: [autoScalingGroup],
            healthCheck: {
                path: '/',
                interval: cdk.Duration.minutes(1),
            },
        });
    }
}
