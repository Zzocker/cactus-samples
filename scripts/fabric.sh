#!/bin/bash
# uses fabric-sample for starting fabric network

. ./scripts/utils.sh

WRKDIR=${PWD}
COMPONENT_FOLDER=${PWD}/components/fabric

function setup(){
    infoln "Setup Fabric Component at $COMPONENT_FOLDER"
    rm -r $COMPONENT_FOLDER
    mkdir $COMPONENT_FOLDER
    cd $COMPONENT_FOLDER
    
    infoln "Downloading Fabric Binaries and Sample"
    curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.2.3 1.5.1 -d
    if [ ! $? -eq 0 ];then
        fatalln "Failed to download the Fabric Binaries and Sample"
    fi
    successln "Fabric Component"
}

function clean(){
    infoln "Clean Fabric Component from $COMPONENT_FOLDER"
    if [ -d $COMPONENT_FOLDER ];then
        rm -r $COMPONENT_FOLDER
    fi
}

function network(){
    infoln "Start Fabric Network"
    infoln "Two Org Setup"
    infoln "Two CA"
    infoln "CouchDB as StateDatabase"
    cd $COMPONENT_FOLDER/fabric-samples
    cd test-network
    
    infoln "./network.sh up createChannel -ca -c mychannel -s couchdb"
    ./network.sh up createChannel -ca -c mychannel -s couchdb
    if [ ! $? -eq 0 ];then
        fatalln "Failed to start fabric network"
    fi
    sleep 5
    infoln "Deploying asset-transfer-basic chaincode"
    ./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-go -ccl go
    if [ ! $? -eq 0 ];then
        fatalln "Failed to deploy asset-transfer-basic chaincode"
    fi
    ./organizations/ccp-generate.sh

    for ORG in org1 org2
    do
        cp -r "organizations/peerOrganizations/$ORG.example.com/connection-$ORG.json" "$COMPONENT_FOLDER/connection-$ORG.json"
    done
    successln "==============================================================="
    successln "Fabric Network started"
    successln "==============================================================="
    successln "Org1 COnnection Profile at : $COMPONENT_FOLDER/connection-org1.json"
    successln "peer0.org1.example.com's couchDB"
    successln "URL : http://localhost:5984/_utils"
    successln "username : admin"
    successln "password : adminpw"
    successln "==============================================================="
    successln "Org2 COnnection Profile at : $COMPONENT_FOLDER/connection-org2.json"
    successln "peer0.org2.example.com's couchDB"
    successln "URL : http://localhost:7984/_utils"
    successln "username : admin"
    successln "password : adminpw"
    successln "==============================================================="
}

function networkClean(){
    infoln "Clean up fabric network"
    cd $COMPONENT_FOLDER/fabric-samples
    cd test-network
    ./network.sh down
    for ORG in org1 org2
    do
        rm "$COMPONENT_FOLDER/connection-$ORG.json"
    done
}

CMD=$1

case $CMD in
    "setup")
        setup
    ;;

    "clean")
        clean
    ;;
    "network")
        network
    ;;
    "network-clean")
        networkClean
    ;;
esac

cd $WRKDIR