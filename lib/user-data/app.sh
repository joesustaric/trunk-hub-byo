#!/bin/bash
set -e

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
