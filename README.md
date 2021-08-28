# Cactus Samples

Not a officially HL cactus sample, demonstrating multiple samples which make use of HL cactus project.

- [Cactus Samples](#cactus-samples)
  - [Getting Started](#getting-started)
    - [HL Fabric Network](#hl-fabric-network)
  - [Samples](#samples)

## Getting Started

Download all the necessary files required for starting different ledgers

```cmd
    ./sample.sh setup
```

### HL Fabric Network

Start two org network using couchDB as state database

```cmd
    ./sample.sh network::fabric    
```

Clean Up Fabric network

```cmd
    ./sample.sh network::fabric-clean
```

Fabric Network Network Details

- Deployed Chaincode is `asset-transfer-basic`
- Org1 Connection profile can be found at `components/fabric/connection-org1.json`
- peer0.org1.example.com's couchDB :
  - URL : http://localhost:5984/_utils
  - username : `admin`
  - password : `adminpw`
- Org2 Connection profile can be found at `components/fabric/connection-org2.json`
- peer0.org2.example.com's couchDB :
  - URL : http://localhost:7984/_utils
  - username : `admin`
  - password : `adminpw`

## Samples

- [Fabric With Identities](fabric-with-identities/README.md)