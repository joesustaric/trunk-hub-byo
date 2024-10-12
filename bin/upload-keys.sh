#!/bin/bash
set -e

# Constants
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
KEYS_DIR="$ROOT_DIR/keys"
REGION="ap-southeast-2"

# Function to upload a public key to SSM Parameter Store
upload_public_key() {
    local key_name=$1
    local parameter_name=$2
    local key_path="$KEYS_DIR/$key_name.pub"

    echo "Checking if public key file exists at $key_path"
    if [[ -f "$key_path" ]]; then
        echo "Uploading public key $key_name to SSM Parameter Store..."
        local key_content=$(cat "$key_path")
        aws ssm put-parameter \
            --name "$parameter_name" \
            --value "$key_content" \
            --type "String" \
            --overwrite \
            --region "$REGION" \
            --no-cli-pager
    else
        echo "Public key file $key_path not found!"
    fi
}

# Function to upload a private key to Secrets Manager
upload_private_key() {
    local key_name=$1
    local secret_name=$2
    local key_path="$KEYS_DIR/$key_name"

    echo "Checking if private key file exists at $key_path"
    if [ -f "$key_path" ]; then
        echo "Uploading private key $key_name to Secrets Manager..."
        local key_content=$(cat "$key_path")
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$key_content" \
            --region "$REGION" \
            --no-cli-pager
    else
        echo "Private key file $key_path not found!"
    fi
}

# Upload public keys to SSM Parameter Store
upload_public_key "ssh-rsa-key" "/trunk-hub/ssh/public-rsa-ssh-key"
upload_public_key "ssh-ecdsa-key" "/trunk-hub/ssh/public-ecdsa-ssh-key"
upload_public_key "ssh-ed25519-key" "/trunk-hub/ssh/public-ed25519-ssh-key"

# Upload private keys to Secrets Manager"
upload_private_key "ssh-rsa-key" "trunk-hub-app-rsa-ssh-key"
upload_private_key "ssh-ecdsa-key" "trunk-hub-app-ecdsa-ssh-key"
upload_private_key "ssh-ed25519-key" "trunk-hub-app-ed25519-ssh-key"

echo "Key upload completed successfully."
