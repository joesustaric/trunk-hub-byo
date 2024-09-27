import { Construct } from 'constructs';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import { applyCheckovSkips } from './exceptions/trunk-hub-app-stack-ex';
import * as fs from 'fs';
import * as path from 'path';

interface TrunkHubAppStackProps extends cdk.StackProps {
    vpcStackName: string;
}
export class TrunkHubAppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: TrunkHubAppStackProps) {
        super(scope, id, props);

        //Import values needed from VPC Stack Outputs
        //TODO: or pass these in from existing VPC
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

        const kmsKey = new kms.Key(this, 'app-kms-key', {
            enableKeyRotation: true,
            alias: 'trunk-hub-app-key',
            description: 'KMS key to encrypt things',
        });

        // SSM parameter for the rsa public key
        new ssm.StringParameter(this, 'app-public-rsa-ssh-key', {
            parameterName: '/trunk-hub/ssh/public-rsa-ssh-key',
            stringValue: "replace me with a public rsa key",
            description: 'Public key for SSH access',
            tier: ssm.ParameterTier.STANDARD,
        });

        // SSM parameter for the ecdsa public key
        new ssm.StringParameter(this, 'app-public-ecdsa-ssh-key', {
            parameterName: '/trunk-hub/ssh/public-ecdsa-ssh-key',
            stringValue: "replace me with a public ecdsa key",
            description: 'Public key for SSH access',
            tier: ssm.ParameterTier.STANDARD,
        });

        // SSM parameter for the ed25519 public key
        new ssm.StringParameter(this, 'app-public-ed25519-ssh-key', {
            parameterName: '/trunk-hub/ssh/public-ed25519-ssh-key',
            stringValue: "replace me with a public ed25519 key",
            description: 'Public key for SSH access',
            tier: ssm.ParameterTier.STANDARD,
        });

        // Secret Store Parameter and read in the rsa private key
        const sshRsaPrivateKeySecret = new secretsmanager.Secret(this, 'app-private-rsa-ssh-key', {
            secretName: 'trunk-hub-app-rsa-ssh-key',
            description: 'Private key for SSH access',
            encryptionKey: kmsKey,
        });

        // Secret Store Parameter for ecdsa private key
        const sshEcsdaPrivateKeySecret = new secretsmanager.Secret(this, 'app-private-ecdsa-ssh-key', {
            secretName: 'trunk-hub-app-ecdsa-ssh-key',
            description: 'Private key for SSH access',
            encryptionKey: kmsKey,
        });

        // Secret Store Parameter and read in the private key
        const sshEd25519PrivateKeySecret = new secretsmanager.Secret(this, 'app-private-ed25519-ssh-key', {
            secretName: 'trunk-hub-app-ed25519-ssh-key',
            description: 'Private key for SSH access',
            encryptionKey: kmsKey,
        });

        // Create a Network Load Balancer (NLB)
        const nlb = new elbv2.NetworkLoadBalancer(this, 'app-nlb', {
            vpc,
            internetFacing: true,
            vpcSubnets: {
            subnets: [
                ec2.Subnet.fromSubnetId(this, 'PublicSubnet1', publicSubnet1),
                ec2.Subnet.fromSubnetId(this, 'PublicSubnet2', publicSubnet2),
            ],
            },
        });

        // Create an S3 bucket for NLB logs
        const nlbLogBucket = new s3.Bucket(this, 'nlb-logs', {
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

        // Enable access logging for the NLB
        nlb.logAccessLogs(nlbLogBucket);

        // Set NLB attributes
        nlb.setAttribute('load_balancing.cross_zone.enabled', 'true')
        nlb.setAttribute('access_logs.s3.bucket', nlbLogBucket.bucketName)
        nlb.setAttribute('access_logs.s3.enabled', 'true')

        // Create an IAM role for EC2 Instance Connect
        const ec2InstanceRole = new iam.Role(this, 'ec2-instance-connect-role', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('EC2InstanceConnect')
            ],
        });

        sshRsaPrivateKeySecret.grantRead(ec2InstanceRole);
        sshEcsdaPrivateKeySecret.grantRead(ec2InstanceRole);
        sshEd25519PrivateKeySecret.grantRead(ec2InstanceRole);

        const securityGroup = new ec2.SecurityGroup(this, 'instance-security-group', {
            allowAllOutbound: true,
            vpc,
        });
        securityGroup.addIngressRule(
            ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access'
        );

        // User data script to set up the server
        const userData = ec2.UserData.forLinux();
        const userDataScript = fs.readFileSync(path.join(__dirname, 'user-data/app.sh'), 'utf8');
        userData.addCommands(userDataScript);

        // Create an Auto Scaling group
        const autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'app-asg', {
            blockDevices: [{
                deviceName: '/dev/xvda', // Root volume
                volume: autoscaling.BlockDeviceVolume.ebs(8, {
                    volumeType: autoscaling.EbsDeviceVolumeType.GP3,
                    encrypted: true,
                    deleteOnTermination: true,
                }),
            },],
            desiredCapacity: 2,
            //TODO: make a parameter
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
            role: ec2InstanceRole,
            securityGroup: securityGroup,
            requireImdsv2: true,
            userData: userData,
            vpc,
            vpcSubnets: {
                subnets: vpc.privateSubnets,
            },
        });

        // Create a target group for SSH
        const sshTargetGroup = new elbv2.NetworkTargetGroup(this, 'ssh-target-group', {
            vpc,
            port: 22,
            protocol: elbv2.Protocol.TCP,
            targets: [autoScalingGroup],
            healthCheck: {
                port: '22',
                protocol: elbv2.Protocol.TCP,
                interval: cdk.Duration.seconds(20),
                timeout: cdk.Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 2,
            },
        });

        // Only listen on port 22 (git over ssh)
        nlb.addListener('ssh-listener', {
            port: 22,
            protocol: elbv2.Protocol.TCP,
            defaultTargetGroups: [sshTargetGroup],
        });

        applyCheckovSkips(securityGroup, nlbLogBucket)
    }
}
