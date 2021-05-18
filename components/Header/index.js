import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { Contract } from "@ethersproject/contracts";

import { Text, Box, HStack, Container, Center } from "@chakra-ui/layout";
import { Button, ButtonGroup } from "@chakra-ui/button";

import { useWeb3 } from "../../helpers/web3";
import { shortenAddress } from "../../helpers/utils";

import abiErc20 from "../../abi/erc20.json";
import { formatUnits } from "../../helpers/units";

var WBTC = "0x04c282520a9191d52eAAf44fd3d50F26339a05F4";
//"0x04c282520a9191d52eAAf44fd3d50F26339a05F4";  //bsc test 8 
//"0xe5866FbE4119B0f3ea744787fd3957D67aADD6B9"; //bsc test 18
//0x677ae04a5216e664a4aa7a034a56de36dccc41b0 ropsten 18
//0x2260fac5e5542a773aa44fbcfedf7c193bc2c599 eth main net 8
var SATOSHI = "0x09a8f7A6F7C4F30c18A9269E999A1f69475856E1";
//"0x09a8f7A6F7C4F30c18A9269E999A1f69475856E1";  //bsc test 18 to bsc8
//"0xc98E4DE692B9Aa34C60fC2a1102A1E0830320828";  //bsc test 18 to bsc18

export default function Header() {
  const { active, activate, deactivate, account, pending, library, provider } = useWeb3();
  const [userBalanceWbtc, setUserBalanceWbtc] = useState(0);
  const [userBalanceSato, setUserBalanceSato] = useState(0);

  if(provider){
    let chainId = provider.chainId;
    if(chainId == 1){   //eth mainnet
      WBTC = "0x04c282520a9191d52eAAf44fd3d50F26339a05F4";
      SATOSHI = "0x09a8f7A6F7C4F30c18A9269E999A1f69475856E1";
    }else{
      WBTC = "0xe5866FbE4119B0f3ea744787fd3957D67aADD6B9";
      SATOSHI = "0xc98E4DE692B9Aa34C60fC2a1102A1E0830320828";
    }
      
  }

  useEffect(() => {
    if (active && library && account) {
      
      const wbtcContract = new Contract(WBTC, abiErc20, library);
      const satoContract = new Contract(SATOSHI, abiErc20, library);
      
      wbtcContract.balanceOf(account).then((res) => {
        console.log("enter Header...", account, wbtcContract, res);
      });

      wbtcContract.balanceOf(account).then(setUserBalanceWbtc);
      satoContract.balanceOf(account).then(setUserBalanceSato);
    } else {
      setUserBalanceWbtc(0);
      setUserBalanceSato(0);
    }
  }, [active, library, account]);

  const [userDisplayToken, setUserDisplayToken] = useState(true);
  const toggleUserDisplayToken = useCallback(
    () => setUserDisplayToken(!userDisplayToken),
    [setUserDisplayToken, userDisplayToken]
  );

  const displayBalance = useMemo(
    () =>
      userDisplayToken
        ? `${formatUnits(userBalanceWbtc, 8)} WBTC`
        : `${formatUnits(userBalanceSato, 18)} SAT`,
    [userDisplayToken, userBalanceWbtc, userBalanceSato]
  );

  return (
    <Container maxW="container.xl">
      <HStack py={5} wrap="wrap" spacing={0}>
        <Link href="/">
          <a>
            <HStack spacing={2}>
              <Text fontSize="5xl" fontWeight="extrabold">
                Satoshi Coin
              </Text>
              <Center>
                <Image src="/tokens/SAT.svg" width={32} height={32} />
              </Center>
            </HStack>
          </a>
        </Link>
        <Box flexGrow={1}></Box>
        <Box>
          {(!active || !account) && (
            <Button
              colorScheme="blackAlpha"
              boxShadow="sm"
              onClick={activate}
              isLoading={pending}
            >
              Connect to a wallet
            </Button>
          )}
          {active && account && (
            <ButtonGroup isAttached boxShadow="sm">
              <Button colorScheme="blackAlpha" onClick={toggleUserDisplayToken}>
                {displayBalance}
              </Button>
              <Button
                colorScheme="whiteAlpha"
                fontFamily="monospace"
                onClick={deactivate}
              >
                {shortenAddress(account)}
              </Button>
            </ButtonGroup>
          )}
        </Box>
      </HStack>
    </Container>
  );
}
