import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as ssm from 'aws-cdk-lib/aws-ssm';

interface TrunkHubBackupStackProps extends cdk.StackProps {
    vpcStackName: string;
}

export class TrunkHubBackupStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: TrunkHubBackupStackProps) {
        super(scope, id, props);

        // Retrieve the EFS file system ID from the SSM parameter store
        const efsFileSystemId = ssm.StringParameter.valueFromLookup(this, '/trunk-hub/efs-file-system-id');

        // Create a backup vault
        const backupVault = new backup.BackupVault(this, 'trunk-hub-backup-vault', {
            backupVaultName: 'trunk-hub-backup-vault',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Create a backup plan
        const backupPlan = new backup.BackupPlan(this, 'trunk-hub-backup-plan', {
            backupPlanName: 'trunk-hub-backup-plan',
            backupVault: backupVault,
        });

        // Add a rule to the backup plan
        backupPlan.addRule(new backup.BackupPlanRule({
            ruleName: 'hourly-backup',
            scheduleExpression: cdk.aws_events.Schedule.cron({ minute: '0', hour: '*' }), // Hourly at the start of the hour
            deleteAfter: cdk.Duration.days(90), // Retain backups for 90 days
        }));

        // Create a backup selection to include the EFS file system
        backupPlan.addSelection('BackupSelection', {
            resources: [
                backup.BackupResource.fromArn(
                    `arn:aws:elasticfilesystem:${this.region}:${this.account}:file-system/${efsFileSystemId}`
                ),
            ],
        });

        // SSM parameter for the backup vault name
        new ssm.StringParameter(this, 'BackupVaultName', {
            parameterName: '/trunk-hub/backup-vault-name',
            stringValue: backupVault.backupVaultName,
            description: 'Name of the backup vault for EFS backups',
            tier: ssm.ParameterTier.STANDARD,
        });
    }
}
