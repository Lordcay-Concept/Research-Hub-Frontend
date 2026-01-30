import React from "react";
import { Flex, Text, Badge, useColorModeValue, Box } from "@chakra-ui/react";

const Header = () => {
  const textColor = useColorModeValue("gray.800", "white");
  const subTextColor = useColorModeValue("blue.500", "blue.300");

  return (
    <Flex direction="column" align="start" justify="center">
      <Flex align="center" gap={2}>
        <Text
          fontSize={{ base: "md", md: "xl" }} 
          fontWeight="bold"
          letterSpacing="tight"
          color={textColor}
          lineHeight="1"
        >
          RESEARCH HUB
        </Text>
        <Badge
          colorScheme="blue"
          variant="subtle"
          fontSize={{ base: "8px", md: "10px" }} 
          borderRadius="full"
          px={2}
        >
          v1.0
        </Badge>
      </Flex>

      <Box display={{ base: "none", sm: "block" }}>
        <Text
          fontSize="10px"
          fontWeight="bold"
          color={subTextColor}
          textTransform="uppercase"
          letterSpacing="wider"
        >
          Intelligence Stream
        </Text>
      </Box>
    </Flex>
  );
};

export default Header;
