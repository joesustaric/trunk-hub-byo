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
echo "Setting up SSH directory and authorized keys..."
mkdir -p .ssh && chmod 700 .ssh
sudo chown -R git:git /home/git/.ssh
sudo runuser -l git -c 'touch .ssh/authorized_keys && chmod 600 .ssh/authorized_keys'
sudo runuser -l git -c 'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF3OuNRLfCK3upvG6JKmDAlnsl6x4bxkCnKQbrIt7+uk joe@emaill.com" >> ~/.ssh/authorized_keys'


# Set up a bare Git repository
echo "Setting up a bare Git repository..."
sudo runuser -l git -c 'mkdir -p /srv/git/trunk-hub-test.git'
sudo runuser -l git -c 'cd /srv/git/trunk-hub-test.git && git init --bare --initial-branch=trunk'

echo "Seting up SSH agent and add the private key"
aws secretsmanager get-secret-value --secret-id trunk-hub-app-ssh-key --region ap-southeast-2 --query SecretString --output text > /etc/ssh/ssh_host_rsa_key
sudo chmod 600 /etc/ssh/ssh_host_rsa_key
chown root:root /etc/ssh/ssh_host_rsa_key

echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCfgUG6Gdzv4TUuvgVYKikVlQj2UfSd10YDv+tapDAHDzCBhreWGn3Ua1fCsgb5d2N3E6cyPWUXyL3fLxbpRI+BgVDxqO++WXJv7uyMcmf8ELICwuLhfgA02fKN4CbhvBf1NpKWf5mfmztB2DlZKoEFcrHmBex9JReuErSlB4lWu8108nbnHroMgnlKGPWWYd0fEfJv8yYcs9p3+W5TeAlVbXFgMo1uW5dsBoxeNhQpLCDoY7MW5ZkMnds1ZzQ2uYR1eQl8kTGDHcxKNqs2nHRVp9+IttqrznTKcBlPCJjwrjrZVJNWoaLZFKHnb31e7uG4u4xG9pK2NgO7aI580n9Z4VObPx42MWxLeysuePQhvT/keuqNplcrOJ2mhcynVLnhgLzoziwb0RBIQwbCJf3tpS2Rh82CaAdx3vWnwwY5aEhsbMbaR1o4SGUv1nu0RDuXNtGT/MOOvC8VVwmabGZdmxXy0xdp7WHrzc6C0U8pANcB/L93/jqOYC6wXZv1NojHuQD7PWJxCkU7pbyY+n3p1Ed5etZIFH8/41WczOjP+U+uOozMnz/N4inDBJ10gfLp7q3i0scly/uOr8fRv1X+wnsHzyq/SRmGBnDVPnkNOraMtHsp0l3DgWNfXCRfoUo/lyUiw30IYWhO0IAcajgHJ36RluTYkrMZNZLg4L1CUQ== git@trunk-hub.com" > /etc/ssh/ssh_host_rsa_key.pub
chmod 644 /etc/ssh/ssh_host_rsa_key.pub
chown root:root /etc/ssh/ssh_host_rsa_key.pub
systemctl restart sshd

echo "User data script completed successfully."
