#!/bin/bash
set -e

# Constants
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
KEYS_DIR="$ROOT_DIR/keys"

# Create keys directory if it doesn't exist
mkdir -p "$KEYS_DIR"

echo "Generating SSH keys in $KEYS_DIR..."

# Generate RSA key (4096 bits)
echo "Generating RSA key..."
ssh-keygen -t rsa -b 4096 -f "$KEYS_DIR/ssh-rsa-key" -N "" -C "trunk-hub-rsa"

# Generate ECDSA key
echo "Generating ECDSA key..."
ssh-keygen -t ecdsa -b 521 -f "$KEYS_DIR/ssh-ecdsa-key" -N "" -C "trunk-hub-ecdsa"

# Generate Ed25519 key
echo "Generating Ed25519 key..."
ssh-keygen -t ed25519 -f "$KEYS_DIR/ssh-ed25519-key" -N "" -C "trunk-hub-ed25519"

# Set appropriate permissions
chmod 600 "$KEYS_DIR"/ssh-*-key
chmod 644 "$KEYS_DIR"/ssh-*-key.pub

echo "Key generation completed successfully."
echo "Keys are stored in: $KEYS_DIR"
echo "You can now run the upload-keys.sh script to upload them to AWS."
