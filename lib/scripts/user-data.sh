#!/bin/bash
set -ex

REGION=ap-southeast-2

yum update -y
yum install -y git amazon-efs-utils

echo "Creating user 'git'..."
sudo adduser git

sudo mkdir -p /srv/git
sudo chown -R git:git /srv/git

echo "Mounting EFS file system..."
EFS_DNS_NAME=$(\
    aws ssm get-parameter \
        --name /trunk-hub/efs-dns-name \
        --region "$REGION" \
        --query Parameter.Value \
        --output text \
    )
sudo mount -t efs -o tls,iam "$EFS_DNS_NAME:/" /srv/git/

# Switch to the 'git' user
sudo su git
cd /home/git

# Set up SSH directory and authorized keys
# TODO: Fix this so that you can add keys somewhere else.
echo "Setting up SSH directory and authorized keys..."
mkdir -p .ssh && chmod 700 .ssh
sudo chown -R git:git /home/git/.ssh
sudo runuser -l git -c 'touch .ssh/authorized_keys && chmod 600 .ssh/authorized_keys'

# Configure who has access
# Add the public key to authorized_keys put yours here and delete mine. (especially if you're not me)
sudo runuser -l git -c 'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF3OuNRLfCK3upvG6JKmDAlnsl6x4bxkCnKQbrIt7+uk joe@email.com" >> ~/.ssh/authorized_keys'

# copy and paste this line to add more public keys
# then recycle the Ec2 instances to apply the changes
#sudo runuser -l git -c 'echo "the-public-key email@email.com" >> ~/.ssh/authorized_keys'

# Retrieve the bucket name from the SSM parameter store
SCRIPTS_BUCKET_NAME=$(\
    aws ssm get-parameter \
        --name /trunk-hub/ec2-scripts-bucket \
        --region "$REGION" \
        --query Parameter.Value \
        --output text \
)
# Create a temporary directory to store the downloaded scripts
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
# List and download all scripts with the prefix 'ec2-scripts' from the S3 bucket
aws s3 cp s3://"$SCRIPTS_BUCKET_NAME"/ec2-scripts/ . --recursive --region ap-southeast-2
# Move the scripts to a global executable location
sudo chmod +x ./*
sudo mv ./* /usr/local/bin/
cd -
rm -rf "$TEMP_DIR"


echo "Seting up SSH agent and add the public/private keys"
# Function to download and set permissions for SSH keys
get_ssm_param_and_set_perm() {
    local key_name=$1
    local key_path=$2

    aws ssm get-parameter \
        --name "$key_name" \
        --region "$REGION" \
        --query Parameter.Value \
        --output text > "$key_path"

    chmod 644 "$key_path"
    chown root:root "$key_path"
}

echo "Downloading and saving public keys from SSM Parameter Store..."
get_ssm_param_and_set_perm "/trunk-hub/ssh/public-rsa-ssh-key" "/etc/ssh/ssh_host_rsa_key.pub"
get_ssm_param_and_set_perm "/trunk-hub/ssh/public-ecdsa-ssh-key" "/etc/ssh/ssh_host_ecdsa_key.pub"
get_ssm_param_and_set_perm "/trunk-hub/ssh/public-ed25519-ssh-key" "/etc/ssh/ssh_host_ed25519_key.pub"

# Function to download and set permissions for SSH keys from Secrets Manager
get_priv_key_and_save() {
    local secret_id=$1
    local file_path=$2

    aws secretsmanager get-secret-value \
        --secret-id "$secret_id" \
        --region "$REGION" \
        --query SecretString \
        --output text > "$file_path"

    chmod 600 "$file_path"
    chown root:root "$file_path"
}

echo "Setting up SSH agent and adding the private keys..."
get_priv_key_and_save "trunk-hub-app-rsa-ssh-key" "/etc/ssh/ssh_host_rsa_key"
get_priv_key_and_save "trunk-hub-app-ecdsa-ssh-key" "/etc/ssh/ssh_host_ecdsa_key"
get_priv_key_and_save "trunk-hub-app-ed25519-ssh-key" "/etc/ssh/ssh_host_ed25519_key"

systemctl restart sshd

echo "User data script completed successfully."
