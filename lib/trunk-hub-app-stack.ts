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

        // Create a Network Load Balancer
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

        // Create an S3 bucket for ALB logs
        const nlbLogBucket = new s3.Bucket(this, 'alb-logs', {
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

        // Set nlb attributes
        nlb.setAttribute('load_balancing.cross_zone.enabled', 'true')
        nlb.setAttribute('access_logs.s3.bucket', nlbLogBucket.bucketName)
        nlb.setAttribute('access_logs.s3.enabled', 'true')

        // Create an IAM role for EC2 Instance Connect
        const ec2InstanceConnectRole = new iam.Role(this, 'ec2-instance-connect-role', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('EC2InstanceConnect')
            ],
        });

        const securityGroup = new ec2.SecurityGroup(this, 'instance-security-group', {
            allowAllOutbound: true,
            vpc,
        });
        securityGroup.addIngressRule(
            ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access'
        );

        // User data script to set up a web server
        const userData = ec2.UserData.forLinux();
        userData.addCommands(`
            #!/bin/bash
            set -e

            yum update -y
            yum install -y httpd git
            systemctl enable httpd
            echo "<html><body><h1>It works.</h1></body></html>" > /var/www/html/index.html
            systemctl start httpd

            echo "Creating user 'git'..."
            sudo adduser git

            sudo mkdir -p /srv/git
            sudo chown -R git:git /srv/git

            # Switch to the 'git' user
            sudo su git
            cd /home/git

            # Set up SSH directory and authorized keys
            echo "Setting up SSH directory and authorized keys..."
            mkdir -p .ssh && chmod 700 .ssh
            sudo chown -R git:git /home/git/.ssh
            sudo runuser -l git -c 'touch .ssh/authorized_keys && chmod 600 .ssh/authorized_keys'
            sudo runuser -l git -c 'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF3OuNRLfCK3upvG6JKmDAlnsl6x4bxkCnKQbrIt7+uk joe@emaill.com" >> ~/.ssh/authorized_keys'
            

            # Set up a bare Git repository
            # TODO: mot master branch
            echo "Setting up a bare Git repository..."
            sudo runuser -l git -c 'mkdir -p /srv/git/trunk-hub-test.git'
            sudo runuser -l git -c 'cd /srv/git/trunk-hub-test.git && git init --bare'

            echo "User data script completed successfully."
        `);

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
            role: ec2InstanceConnectRole,
            securityGroup: securityGroup,
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
    }
}
