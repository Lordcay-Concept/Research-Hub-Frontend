import React, { useEffect, useRef } from "react";
import {
  Box,
  Textarea,
  InputGroup,
  InputRightElement,
  IconButton,
  Text,
  VStack,
  Spinner,
  Flex,
  Badge,
  useColorModeValue,
  useClipboard,
  HStack,
} from "@chakra-ui/react";
import {
  ArrowUpIcon,
  CopyIcon,
  DownloadIcon,
  CheckIcon,
} from "@chakra-ui/icons";
import ReactMarkdown from "react-markdown";
import ResizeTextarea from "react-textarea-autosize";

// --- GLOBAL MARKDOWN STYLING ---
const MarkdownStyles = {
  p: (props) => (
    <Text
      mb={2}
      lineHeight="tall"
      fontSize={{ base: "sm", md: "md" }}
      {...props}
    />
  ),
  ul: (props) => <Box as="ul" ml={4} mb={2} {...props} />,
  li: (props) => (
    <Box as="li" mb={1} fontSize={{ base: "sm", md: "md" }} {...props} />
  ),
  h1: (props) => (
    <Text
      fontSize={{ base: "lg", md: "xl" }}
      fontWeight="bold"
      mb={2}
      {...props}
    />
  ),
  h2: (props) => (
    <Text
      fontSize={{ base: "md", md: "lg" }}
      fontWeight="bold"
      mb={2}
      {...props}
    />
  ),
  code: (props) => (
    <Box
      as="code"
      p={2}
      bg="gray.800"
      color="orange.200"
      borderRadius="md"
      fontSize="xs"
      display="block"
      whiteSpace="pre-wrap"
      my={2}
      {...props}
    />
  ),
};

const ChatInterface = ({
  question,
  setQuestion,
  answer,
  loading,
  onSend,
  tier,
  setTier,
  onDownload,
  thread = [],
}) => {
  const bgColor = useColorModeValue("white", "#1e1e1e");
  const textColor = useColorModeValue("gray.800", "white");
  const userBubbleBg = useColorModeValue("blue.50", "blue.900");
  const aiStandardBg = useColorModeValue("gray.50", "gray.700");
  const aiProBg = useColorModeValue("orange.50", "#2d241e");
  const aiProBorder = useColorModeValue("orange.200", "orange.700");

  const messagesEndRef = useRef(null);
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [thread, loading, answer]);

  const { hasCopied, onCopy } = useClipboard(answer || "");

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const ChatBubble = ({ q, a, isPro, isLast }) => (
    <VStack spacing={4} align="stretch" w="full">
      {/* USER BUBBLE */}
      <Flex justify="flex-end">
        <Box
          bg={userBubbleBg}
          px={4}
          py={3}
          borderRadius="2xl"
          borderBottomRightRadius="none"
          maxW={{ base: "90%", md: "80%" }}
          boxShadow="sm"
        >
          <Text fontSize={{ base: "sm", md: "md" }} color={textColor}>
            {q}
          </Text>
        </Box>
      </Flex>

      {/* AI BUBBLE */}
      <Flex justify="flex-start">
        <Box
          bg={isPro ? aiProBg : aiStandardBg}
          border="1px solid"
          borderColor={isPro ? aiProBorder : "transparent"}
          px={4}
          py={3}
          borderRadius="2xl"
          borderBottomLeftRadius="none"
          maxW={{ base: "95%", md: "85%" }}
          boxShadow={isPro ? "lg" : "sm"}
        >
          {isPro && (
            <Badge colorScheme="orange" variant="subtle" fontSize="9px" mb={1}>
              PRO ANALYSIS
            </Badge>
          )}

          <Box color={textColor}>
            <ReactMarkdown components={MarkdownStyles}>{a}</ReactMarkdown>
          </Box>

          {isLast && a && (
            <HStack mt={3} spacing={2} justify="flex-end">
              <IconButton
                size="xs"
                variant="ghost"
                icon={
                  hasCopied ? <CheckIcon color="green.500" /> : <CopyIcon />
                }
                onClick={onCopy}
              />
              <IconButton
                size="xs"
                variant="ghost"
                icon={<DownloadIcon />}
                onClick={onDownload}
              />
            </HStack>
          )}
        </Box>
      </Flex>
    </VStack>
  );

  return (
    <Flex
      direction="column"
      h="full"
      maxW="900px"
      mx="auto"
      p={{ base: 3, md: 6 }} 
    >
      {/* TIER TABS */}
      <Flex justify="center" gap={2} mb={4}>
        <Badge
          px={{ base: 2, md: 4 }}
          py={1}
          borderRadius="full"
          cursor="pointer"
          fontSize={{ base: "10px", md: "xs" }}
          variant={tier === "free" ? "solid" : "outline"}
          colorScheme="blue"
          onClick={() => setTier("free")}
        >
          Standard
        </Badge>
        <Badge
          px={{ base: 2, md: 4 }}
          py={1}
          borderRadius="full"
          cursor="pointer"
          fontSize={{ base: "10px", md: "xs" }}
          variant={tier === "pro" ? "solid" : "outline"}
          colorScheme="orange"
          onClick={() => setTier("pro")}
        >
          Pro (Thinking)
        </Badge>
      </Flex>

      {/* CHAT BOX */}
      <Box
        flex={1}
        overflowY="auto"
        className="custom-scroll"
        maxH="calc(100vh - 200px)" 
        mb={4}
        p={{ base: 2, md: 4 }}
        bg={bgColor}
        borderRadius="xl"
      >
        <VStack spacing={6} align="stretch">
          {thread.length === 0 && !answer && !loading && (
            <Flex
              direction="column"
              align="center"
              justify="center"
              h="200px"
              opacity={0.6}
            >
              <Text fontSize="md" fontWeight="medium">
                Welcome, Researcher.
              </Text>
            </Flex>
          )}

          {thread.map((chat, index) => (
            <ChatBubble
              key={index}
              q={chat.question}
              a={chat.answer}
              isPro={chat.tier === "pro"}
              isLast={index === thread.length - 1 && !answer}
            />
          ))}

          {answer && (
            <ChatBubble
              q="Research Inquiry"
              a={answer}
              isPro={tier === "pro"}
              isLast={true}
            />
          )}

          {loading && !answer && (
            <HStack spacing={3} pl={2}>
              <Spinner
                size="sm"
                color={tier === "pro" ? "orange.400" : "blue.500"}
              />
              <Text fontSize="xs" color="gray.500">
                Connecting to Groq...
              </Text>
            </HStack>
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* INPUT SECTION: */}
      <Box position="relative" pb={2}>
        <InputGroup size="lg">
          <Textarea
            as={ResizeTextarea}
            minH="50px"
            maxH="150px"
            resize="none"
            pr="3.5rem"
            fontSize={{ base: "sm", md: "md" }}
            placeholder="Ask anything..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            bg={bgColor}
            borderRadius="xl"
            boxShadow="lg"
            pt={3}
          />
          <InputRightElement width="3.5rem" height="100%" alignItems="center">
            <IconButton
              size="sm"
              icon={<ArrowUpIcon w={5} h={5} />}
              colorScheme={tier === "pro" ? "orange" : "blue"}
              onClick={onSend}
              isDisabled={!question.trim() || loading}
            />
          </InputRightElement>
        </InputGroup>
      </Box>
    </Flex>
  );
};

export default ChatInterface;
