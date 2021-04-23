# @couragium/aws-cdk-extras

This package contains helper methods and higher-level constructs for TypeScript development with [AWS CDK](https://aws.amazon.com/cdk/).

This project is currently in beta. The code here is being used for deploying real environments in AWS, however it lacks proper testing. Use at your own risk. Pull requests are welcome.

## Versions
* Current stable version is 0.1.0
* Depends on CDK 1.100.0

## Install
```
    npm i @couragium/aws-cdk-extras
```

## Modules

* Future: Manipulation of tokens resolved at deploy time
* Memcached: Helper methods for Elasticache Memcached clusters
* QLDB: Helper methods for Quantum Ledger DB
* Secrets: Manipulation of secrets without leaking confidential data in CloudFormation jsons