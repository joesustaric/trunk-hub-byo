# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Types of changes to keep track of.

* `Added` for new features.
* `Changed` for changes in existing functionality.
* `Deprecated` for soon-to-be removed features.
* `Removed` for now removed features.
* `Fixed` for any bug fixes.
* `Security`

## [Unreleased]

### Added
- Added CDK AWS VPC Construct for a VPC if you don't have one.
    - EC2 Instance Connect endpoint using EC2 service endpoint
- Created the App stack that creates the git server.
    - EC2 instance with the git server installed (Amazon Linux 2)
    - Network Load Balancer
    - Shared EFS volume
    - S3 Bucket(s) for backups / logging
