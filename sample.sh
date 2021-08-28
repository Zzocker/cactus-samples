#!/bin/bash

. ./scripts/utils.sh


function setup(){
    for COMPONENT in fabric
    do
        ./scripts/$COMPONENT.sh setup
    done
}

function clean(){
    for COMPONENT in fabric
    do
        ./scripts/$COMPONENT.sh clean
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
    "network::fabric")
        ./scripts/fabric.sh network
    ;;
    "network::fabric-clean")
        ./scripts/fabric.sh network-clean
    ;;
    
    *)
        fatalln "no command by name $CMD found"
    ;;
esac