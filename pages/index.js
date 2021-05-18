import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Head from "next/head";

import { Contract } from "@ethersproject/contracts";
import { BigNumber } from "bignumber.js";

import {
  Text,
  Box,
  Stack,
  Center,
  VStack,
  HStack,
  Container,
  Link,
  Flex,
} from "@chakra-ui/layout";
import { Button, ButtonGroup } from "@chakra-ui/button";
import { ArrowDownIcon } from "@chakra-ui/icons";

import Header from "../components/Header";

import { useWeb3 } from "../helpers/web3";
import { formatUnits } from "../helpers/units";

import abiErc20 from "../abi/erc20.json";
import abiSato from "../abi/satoshi.json";

import NumericInput from "../components/NumericInput";
import { usePlausible } from "next-plausible";

const YFI = "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e";
const WOOFY = "0xD0660cD418a64a1d44E9214ad8e459324D8157f1";
const WBTC = "0x04c282520a9191d52eAAf44fd3d50F26339a05F4";
const SATOSHI = "0x09a8f7A6F7C4F30c18A9269E999A1f69475856E1";

const TEN = new BigNumber(10);
const MAX = new BigNumber(2).pow(256).minus(1);

export default function Home() {
  const [page, setPage] = useState("wrap");
  const isWrap = useMemo(() => page === "wrap", [page]);
  const isUnwrap = useMemo(() => page === "unwrap", [page]);

  const plausible = usePlausible();
  const { active, account, library, provider } = useWeb3();

  const [userBalanceWbtc, setUserBalanceWbtc] = useState(0);
  const [userBalanceSato, setUserBalanceSato] = useState(0);
  const [userAllowanceWbtc, setUserAllowanceWbtc] = useState(0);

  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const wbtc = useMemo(
    () => ({
      name: "WBTC",
      symbol: "WBTC",
      image: "/tokens/WBTC.svg",
      address: WBTC,
      decimals: 8,
      balance: new BigNumber(userBalanceWbtc.toString()),
      allowance: new BigNumber(userAllowanceWbtc.toString()),
    }),
    [userBalanceWbtc, userAllowanceWbtc]
  );

  const sato = useMemo(
    () => ({
      name: "Sato",
      symbol: "SAT",
      address: SATOSHI,
      image: "/tokens/SAT.svg",
      decimals: 18,
      balance: new BigNumber(userBalanceSato.toString()),
      allowance: MAX,
    }),
    [userBalanceSato]
  );

  const fromToken = useMemo(() => (isWrap ? wbtc : sato), [wbtc, sato, isWrap]);
  const toToken = useMemo(
    () => (isUnwrap ? wbtc : sato),
    [wbtc, sato, isUnwrap]
  );

  const [value, setValue] = useState("");
  const input = useMemo(
    () =>
      new BigNumber(
        (value.endsWith(".") ? value.slice(0, -1) : value) || "0"
      ).times(TEN.pow(fromToken.decimals)),//.times(TEN.pow(fromToken.decimals))
    [value, fromToken]
  );

  const output = useMemo(() => input, [input]);

  useEffect(() => {
    if (active && library && account) {
      const wbtcContract = new Contract(WBTC, abiErc20, library);
      const satContract = new Contract(SATOSHI, abiErc20, library);

      wbtcContract.balanceOf(account).then(setUserBalanceWbtc);
      satContract.balanceOf(account).then(setUserBalanceSato);

      wbtcContract.allowance(account, SATOSHI).then(setUserAllowanceWbtc);
    } else {
      setUserBalanceWbtc(0);
      setUserBalanceSato(0);
      setUserAllowanceWbtc(0);
    }
  }, [active, library, account, isApproving, isSwapping]);

  const inputValid = useMemo(
    () => !active || !input.gt(fromToken.balance),
    [active, input, fromToken]
  );

  const needsApproval = useMemo(
    () => fromToken.symbol !== "SAT",
    [active, input, fromToken]
  );

  const approveValid = useMemo(
    () =>
      input.lte(fromToken.balance) &&
      input.gt(0) &&
      input.gte(fromToken.allowance),
    [input, fromToken]
  );

  const swapValid = useMemo(
    () =>
      input.lte(fromToken.balance) &&
      input.gt(0) &&
      input.lte(fromToken.allowance),
    [input, fromToken, approveValid]
  );

  const max = useCallback(() => {
    setValue(fromToken.balance.div(TEN.pow(fromToken.decimals)).toFixed());
  }, [fromToken, setValue]);

  const approve = useCallback(() => {
    const fromContract = new Contract(
      fromToken.address,
      abiErc20,
      library.getSigner(account)
    );
    setIsApproving(true);
    fromContract
      .approve(toToken.address, MAX.toFixed())
      .catch(() => setIsApproving(false))
      .then((tx) => tx.wait())
      .catch(() => setIsApproving(false))
      .then(() => setIsApproving(false));
  }, [fromToken, toToken, library, account]);

  const sat = useCallback(() => {
    const satContract = new Contract(
      sato.address,
      abiSato,
      library.getSigner(account)
    );
    setIsSwapping(true);
    satContract.functions["sat(uint256)"](input.toFixed())
      .catch(() => setIsSwapping(false))
      .then((tx) => tx.wait())
      .catch(() => setIsSwapping(false))
      .then(() => setIsSwapping(false));
    plausible("Sat", { props: { amount: input.toFixed()} });
  }, [fromToken, toToken, library, account, input]);

  const unsat = useCallback(() => {
    const satContract = new Contract(
      sato.address,
      abiSato,
      library.getSigner(account)
    );
    setIsSwapping(true);
    satContract.functions["unsat(uint256)"](input.toFixed())
      .catch(() => setIsSwapping(false))
      .then((tx) => tx.wait())
      .catch(() => setIsSwapping(false))
      .then(() => setIsSwapping(false));
    plausible("Unsat", { props: { amount: input.toFixed()} });
  }, [sato, toToken, library, account, input]);

  const swap = useMemo(() => (isWrap ? sat : unsat), [isWrap, sat, unsat]);

  const addToken = useCallback(
    (token) => {
      if (active && provider) {
        provider
          .request({
            method: "wallet_watchAsset",
            params: {
              type: "ERC20",
              options: {
                address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                image: `https://test.satscoin.net/${token.image}`,
              },
            },
          })
          .catch(console.error);
      }
    },
    [active, provider]
  );

  return (
    <Box minH="100vh" color="white">
      <Head>
        <title>sato</title>
      </Head>
      <Stack spacing={10}>
        <Header />
        <Center>
          <Container>
            <Stack>
              <Box
                bgColor="whiteAlpha.600"
                p="5"
                w="100%"
                maxW="lg"
                borderRadius="8"
              >
                <Stack spacing={6}>
                  <Center>
                    <ButtonGroup isAttached>
                      <Button
                        colorScheme="pink"
                        fontSize="xl"
                        opacity={isWrap ? 0.8 : 0.4}
                        onClick={() => setPage("wrap")}
                        w={["32", "40"]}
                      >
                        Sat
                      </Button>
                      <Button
                        colorScheme="blue"
                        fontSize="xl"
                        opacity={isUnwrap ? 0.8 : 0.4}
                        onClick={() => setPage("unwrap")}
                        w={["32", "40"]}
                      >
                        Unsat
                      </Button>
                    </ButtonGroup>
                  </Center>
                  <VStack spacing={0} color="black" color="black">
                    <Box
                      w="100%"
                      bg="white"
                      p={4}
                      borderRadius={8}
                      boxShadow="lg"
                    >
                      <Stack spacing={2}>
                        <HStack>
                          <Box flexGrow={1}>
                            <Text fontSize="sm">
                              <span>Balance: </span>
                              <Link onClick={max}>
                                {fromToken.balance.gt(0)
                                  ? formatUnits(
                                      fromToken.balance,
                                      fromToken.decimals
                                    )
                                  : "-"}
                              </Link>
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm">
                              <Link onClick={() => addToken(fromToken)}>
                                Add Token
                              </Link>
                            </Text>
                          </Box>
                        </HStack>
                        <NumericInput
                          value={value}
                          onChange={setValue}
                          invalid={!inputValid}
                          element={
                            <Image
                              src={fromToken.image}
                              width="32"
                              height="32"
                            />
                          }
                        />
                      </Stack>
                    </Box>
                    <Box
                      w="90%"
                      bg="whiteAlpha.700"
                      px={4}
                      py={3}
                      boxShadow="sm"
                    >
                      <Center>
                        <ArrowDownIcon />
                      </Center>
                    </Box>
                    <Box
                      w="100%"
                      bg="white"
                      p={4}
                      borderRadius={8}
                      boxShadow="lg"
                    >
                      <Stack spacing={2}>
                        <HStack>
                          <Box flexGrow={1}>
                            <Text fontSize="sm">
                              <span>Balance: </span>
                              {toToken.balance.gt(0)
                                ? formatUnits(toToken.balance, toToken.decimals)
                                : "-"}
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm">
                              <Link onClick={() => addToken(toToken)}>
                                Add Token
                              </Link>
                            </Text>
                          </Box>
                        </HStack>
                        <NumericInput
                          disabled
                          value={formatUnits(output, isWrap ? 0 : toToken.decimals + fromToken.decimals, false)}
                          element={
                            <Image src={toToken.image} width="32" height="32" />
                          }
                        />
                      </Stack>
                    </Box>
                  </VStack>
                  <HStack width="100%">
                    {needsApproval && (
                      <Button
                        width="100%"
                        colorScheme="blackAlpha"
                        size="lg"
                        disabled={!approveValid}
                        isLoading={isApproving}
                        onClick={approve}
                      >
                        Approve
                      </Button>
                    )}
                    <Button
                      width="100%"
                      colorScheme="blackAlpha"
                      size="lg"
                      disabled={!swapValid}
                      isLoading={isSwapping}
                      onClick={swap}
                    >
                      {isWrap ? "Sat" : "Unsat"}
                    </Button>
                  </HStack>
                </Stack>
              </Box>
              <Box
                bgColor="whiteAlpha.300"
                p="5"
                w="100%"
                maxW="lg"
                borderRadius="8"
              >
                <Stack spacing={6}>
                  <HStack wrap="wrap" spacing={0}>
                    <Box flexGrow={1}>
                      <Text>
                        <Link href="https://matcha.xyz/markets/0xd0660cd418a64a1d44e9214ad8e459324d8157f1/ETH">
                          🍵 Trade
                        </Link>
                        <span> / </span>
                        <Link href="https://docs.yearn.finance/products/sato">
                          📃 Docs
                        </Link>
                      </Text>
                    </Box>
                    <Box>
                      <Text>
                        by <Link href="https://yearn.finance">🔵</Link> with 💙
                      </Text>
                    </Box>
                  </HStack>
                </Stack>
              </Box>
            </Stack>
          </Container>
        </Center>
        <Box p="2"></Box>
      </Stack>
    </Box>
  );
}
