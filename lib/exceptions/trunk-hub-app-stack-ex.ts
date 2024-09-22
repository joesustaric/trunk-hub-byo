import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';

export function applyCheckovSkips(
    securityGroup: ec2.SecurityGroup,
    nlbLogBucket: s3.Bucket) {

    const cfnSecurityGroup = securityGroup.node.defaultChild as ec2.CfnSecurityGroup;
    cfnSecurityGroup.cfnOptions.metadata = {
        'checkov': {
            'skip': [
                {
                    'id': 'CKV_AWS_24',
                    'comment': 'This project allows git over ssh'
                },
            ]
        }
    }

    const cfnNlbLogBucket = nlbLogBucket.node.defaultChild as s3.CfnBucket;
    cfnNlbLogBucket.cfnOptions.metadata = {
        'checkov': {
            'skip': [
                {
                    'id': 'CKV_AWS_18',
                    'comment': 'Do not need access logging on this bucket'
                },
            ]
        }
    }
}
