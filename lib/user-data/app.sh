#!/bin/bash
set -ex

yum update -y
yum install -y git

echo "Creating user 'git'..."
sudo adduser git

sudo mkdir -p /srv/git
sudo chown -R git:git /srv/git

# Switch to the 'git' user
sudo su git
cd /home/git

# Set up SSH directory and authorized keys
# TODO: Fix this so that you can add keys somewhere else.
echo "Setting up SSH directory and authorized keys..."
mkdir -p .ssh && chmod 700 .ssh
sudo chown -R git:git /home/git/.ssh
sudo runuser -l git -c 'touch .ssh/authorized_keys && chmod 600 .ssh/authorized_keys'
sudo runuser -l git -c 'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF3OuNRLfCK3upvG6JKmDAlnsl6x4bxkCnKQbrIt7+uk joe@emaill.com" >> ~/.ssh/authorized_keys'

# Set up a bare Git repository for testing
# TODO: Fix the default branch name.
echo "Setting up a bare Git repository..."
sudo runuser -l git -c 'mkdir -p /srv/git/trunk-hub-test.git'
sudo runuser -l git -c 'cd /srv/git/trunk-hub-test.git && git init --bare --initial-branch=trunk'

echo "Seting up SSH agent and add the private keys"
aws secretsmanager get-secret-value --secret-id trunk-hub-app-rsa-ssh-key --region ap-southeast-2 --query SecretString --output text > /etc/ssh/ssh_host_rsa_key
sudo chmod 600 /etc/ssh/ssh_host_rsa_key
chown root:root /etc/ssh/ssh_host_rsa_key

aws secretsmanager get-secret-value --secret-id trunk-hub-app-ecdsa-ssh-key --region ap-southeast-2 --query SecretString --output text > /etc/ssh/ssh_host_ecdsa_key
sudo chmod 600 /etc/ssh/ssh_host_ecdsa_key
chown root:root /etc/ssh/ssh_host_ecdsa_key

aws secretsmanager get-secret-value --secret-id trunk-hub-app-ed25519-ssh-key --region ap-southeast-2 --query SecretString --output text > /etc/ssh/ssh_host_rsa_key
sudo chmod 600 /etc/ssh/ssh_host_ed25519_key
chown root:root /etc/ssh/ssh_host_ed25519_key

# Download the public keys from SSM Parameter Store and save it to /etc/ssh/
echo "Downloading and saving public keys from SSM Parameter Store..."
aws ssm get-parameter --name /trunk-hub/ssh/public-rsa-ssh-key --region ap-southeast-2 --query Parameter.Value --output text > /etc/ssh/ssh_host_rsa_key.pub
chmod 644 /etc/ssh/ssh_host_rsa_key.pub
chown root:root /etc/ssh/ssh_host_rsa_key.pub

aws ssm get-parameter --name /trunk-hub/ssh/public-ecdsa-ssh-key --region ap-southeast-2 --query Parameter.Value --output text > /etc/ssh/ssh_host_ecdsa_key.pub
chmod 644 /etc/ssh/ssh_host_ecdsa_key.pub
chown root:root /etc/ssh/ssh_host_ecdsa_key.pub

aws ssm get-parameter --name /trunk-hub/ssh/public-ed25519-ssh-key --region ap-southeast-2 --query Parameter.Value --output text > /etc/ssh/ssh_host_ed25519_key.pub
chmod 644 /etc/ssh/ssh_host_ed25519_key.pub
chown root:root /etc/ssh/ssh_host_ed25519_key.pub

systemctl restart sshd

echo "User data script completed successfully."
