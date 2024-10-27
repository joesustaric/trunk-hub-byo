import { Construct } from 'constructs';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ssm from 'aws-cdk-lib/aws-ssm';

interface TrunkHubBackupStackProps extends cdk.StackProps {
    appStackName: string;
}

export class TrunkHubBackupStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: TrunkHubBackupStackProps) {
        super(scope, id, props);

        //TODO: Or parameters if passed in
        const kmsKeyArn = cdk.Fn.importValue(`${props.appStackName}:ArnKMSKey`);
        const efsId = cdk.Fn.importValue(`${props.appStackName}:EFSFileSystemId`);

        // Create a backup vault
        const backupVault = new backup.BackupVault(this, 'trunk-hub-backup-vault', {
            backupVaultName: 'trunk-hub-backup-vault',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            encryptionKey: kms.Key.fromKeyArn(this, 'imported-kms-key', kmsKeyArn),
        });

        // Backup Rule
        const backupRule = new backup.BackupPlanRule({
            ruleName: 'every-6-hours-backup',
            scheduleExpression: cdk.aws_events.Schedule.cron(
                {
                    minute: '0',
                    hour: '0/6' //Every 6 hours
                }
            ),
            moveToColdStorageAfter: cdk.Duration.days(30),
            deleteAfter: cdk.Duration.days(120),
        })

        // Create a backup plan
        const backupPlan = new backup.BackupPlan(this, 'trunk-hub-backup-plan', {
            backupPlanName: 'trunk-hub-backup-plan',
            backupPlanRules: [ backupRule ],
            backupVault: backupVault,
        });

        // Create a backup selection to include the EFS file system
        backupPlan.addSelection('backup-selection', {
            resources: [
                backup.BackupResource.fromArn(
                    `arn:aws:elasticfilesystem:${this.region}:${this.account}:file-system/${efsId}`
                ),
            ],
        });

        // SSM parameter for the backup vault name
        new ssm.StringParameter(this, 'backup-vault-name', {
            parameterName: '/trunk-hub/backup-vault-name',
            stringValue: backupVault.backupVaultName,
            description: 'Name of the backup vault for EFS backups',
            tier: ssm.ParameterTier.STANDARD,
        });
    }
}
