import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface TrunkHubVPCStackProps extends cdk.StackProps {
  vpcCidr: string;
}
export class TrunkHubVPCStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: TrunkHubVPCStackProps) {
    super(scope, id, props);

    // Query the availability zones from AWS and pick any 2
    const availabilityZones = cdk.Stack.of(this).availabilityZones.slice(0, 2);

    const vpc = new ec2.Vpc(this, 'trunk-hub-vpc', {
      ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private-subnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      availabilityZones: availabilityZones,
    });

    // Output the availability zones as individual parameters
    availabilityZones.forEach((az, index) => {
      new cdk.CfnOutput(this, `AvailabilityZone${index + 1}`, {
        value: az,
        description: `Availability Zone ${index + 1}`,
        exportName: `${id}:AvailabilityZone${index + 1}`,
      });
    });

    // Output the VPC ID
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'ID of the VPC',
      exportName: `${id}:VpcId`
    });

    // Output the ARNs of the public subnets
    vpc.publicSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `PublicSubnet${index + 1}`, {
        value: subnet.subnetId,
        description: `ID of public subnet ${index + 1}`,
        exportName: `${id}:PublicSubnet${index + 1}`
      });
    });

    // Output the ARNs of the private subnets
    vpc.privateSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `PrivateSubnet${index + 1}`, {
        value: subnet.subnetId,
        description: `ID of private subnet ${index + 1}`,
        exportName: `${id}:PrivateSubnet${index + 1}`
      });
    });
  }
}
