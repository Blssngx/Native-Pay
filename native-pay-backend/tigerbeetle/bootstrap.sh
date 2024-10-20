#!/bin/bash

rm -f tb_dev_1

./tigerbeetle format --cluster=0 --replica=0 --replica-count=1 --development tb_dev_1

./tigerbeetle start --addresses=3000 --development 0_0.tigerbeetle