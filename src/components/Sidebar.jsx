import React, { useState } from "react";
import {
  Box,
  VStack,
  Text,
  Button,
  Flex,
  Divider,
  useColorModeValue,
  useDisclosure,
  HStack,
  IconButton,
  Input,
  Spacer,
} from "@chakra-ui/react";
import {
  SettingsIcon,
  StarIcon,
  DeleteIcon,
  UnlockIcon,
  AddIcon,
  EditIcon,
  CheckIcon,
  CloseIcon,
} from "@chakra-ui/icons";
import { SettingsModal } from "./SettingsModal";

// --- API CONFIG IMPORT ---
import API_BASE_URL from "../config";

const Sidebar = ({
  history,
  onHistoryClick,
  onClearHistory,
  onNewResearch,
  location,
  isLoggedIn,
  onLoginOpen,
  onClose: onSidebarClose, 
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [editingId, setEditingId] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  const sidebarBg = useColorModeValue("gray.50", "#171717");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("gray.600", "gray.400");
  const historyHoverBg = useColorModeValue("gray.200", "gray.800");

  const uniqueThreads = [];
  const seenChats = new Set();

  history.forEach((item) => {
    if (item.chatId && !seenChats.has(item.chatId)) {
      uniqueThreads.push(item);
      seenChats.add(item.chatId);
    } else if (!item.chatId) {
      uniqueThreads.push(item);
    }
  });

  const handleRenameSubmit = async (chatId) => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/history/rename`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ chatId, newTitle }),
      });
      if (res.ok) {
        setEditingId(null);
        window.location.reload();
      }
    } catch (e) {
      console.error("Rename failed");
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm("Delete this chat thread?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/history/${chatId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Delete failed");
    }
  };

  return (
    <Flex
      w={{ base: "280px", md: "260px" }} 
      direction="column"
      bg={sidebarBg}
      h="100vh"
      borderRight="1px"
      borderColor={borderColor}
      p={4}
    >
      {/* MOBILE HEADER */}
      <HStack display={{ base: "flex", md: "none" }} mb={4}>
        <Text fontSize="xs" fontWeight="bold" color="gray.500">
          RESEARCH HUB
        </Text>
        <Spacer />
        <IconButton
          size="sm"
          variant="ghost"
          icon={<CloseIcon fontSize="10px" />}
          onClick={onSidebarClose}
          aria-label="Close Sidebar"
        />
      </HStack>

      <Button
        colorScheme="blue"
        variant="outline"
        mb={8}
        borderRadius="full"
        size="sm"
        fontSize="xs"
        leftIcon={<AddIcon w={3} h={3} />}
        onClick={onNewResearch}
      >
        New Research
      </Button>

      <VStack
        align="stretch"
        flex={1}
        overflowY="auto"
        spacing={2}
        sx={{
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": { background: "transparent" },
          "&:hover::-webkit-scrollbar-thumb": { background: "gray.500" },
        }}
      >
        <HStack justify="space-between" mb={2}>
          <Text
            fontSize="xs"
            fontWeight="bold"
            color="gray.500"
            letterSpacing="wider"
          >
            {isLoggedIn ? "USER HISTORY" : "GUEST HISTORY"}
          </Text>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="xs"
              colorScheme="red"
              h="20px"
              fontSize="9px"
              onClick={onClearHistory}
              leftIcon={<DeleteIcon w={2} h={2} />}
            >
              Clear All
            </Button>
          )}
        </HStack>

        {uniqueThreads.length === 0 ? (
          <Text fontSize="10px" color="gray.500" textAlign="center" mt={4}>
            No recent research
          </Text>
        ) : (
          uniqueThreads.map((item, index) => (
            <Box key={item.chatId || index} role="group">
              {editingId === item.chatId ? (
                <HStack spacing={1}>
                  <Input
                    size="xs"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                    bg={useColorModeValue("white", "gray.700")}
                  />
                  <IconButton
                    aria-label="Confirm rename"
                    size="xs"
                    icon={<CheckIcon />}
                    colorScheme="green"
                    onClick={() => handleRenameSubmit(item.chatId)}
                  />
                  <IconButton
                    aria-label="Cancel rename"
                    size="xs"
                    icon={<CloseIcon />}
                    onClick={() => setEditingId(null)}
                  />
                </HStack>
              ) : (
                <Flex
                  align="center"
                  py={2}
                  px={3}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: historyHoverBg }}
                  onClick={() => onHistoryClick(item)}
                >
                  <Text
                    fontSize="xs"
                    noOfLines={1}
                    color={textColor}
                    flex={1}
                    _groupHover={{ color: "blue.500" }}
                  >
                    {item.displayQuestion || item.question}
                  </Text>

                  {isLoggedIn && (
                    <HStack
                      spacing={1}
                      display={{ base: "flex", md: "none" }}
                      _groupHover={{ display: "flex" }}
                    >
                      <IconButton
                        aria-label="Edit title"
                        size="xs"
                        variant="ghost"
                        icon={<EditIcon w={2.5} h={2.5} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(item.chatId);
                          setNewTitle(item.displayQuestion || item.question);
                        }}
                      />
                      <IconButton
                        aria-label="Delete chat"
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        icon={<DeleteIcon w={2.5} h={2.5} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(item.chatId);
                        }}
                      />
                    </HStack>
                  )}
                </Flex>
              )}
            </Box>
          ))
        )}
      </VStack>

      <Divider my={4} borderColor={borderColor} />

      <VStack align="stretch" spacing={2}>
        {!isLoggedIn && (
          <Button
            onClick={onLoginOpen}
            variant="solid"
            colorScheme="blue"
            leftIcon={<UnlockIcon />}
            size="sm"
            fontSize="xs"
            borderRadius="md"
            mb={2}
          >
            Sign In to Sync
          </Button>
        )}

        <Button
          bg="#f06b1b"
          color="white"
          _hover={{ bg: "#d95a16" }}
          leftIcon={<StarIcon />}
          size="xs"
          borderRadius="md"
          py={4}
          onClick={() => alert("Premium Dashboard Coming Soon")}
        >
          Upgrade to Pro
        </Button>

        <Button
          onClick={onOpen}
          variant="ghost"
          justifyContent="flex-start"
          leftIcon={<SettingsIcon />}
          size="sm"
          fontSize="xs"
          color={textColor}
        >
          Settings & Hub
        </Button>

        <Box p={2} borderTop="1px" borderColor={borderColor} mt={2}>
          <Text fontSize="10px" color="gray.500" fontWeight="medium">
            {location}
          </Text>
        </Box>
      </VStack>

      <SettingsModal isOpen={isOpen} onClose={onClose} />
    </Flex>
  );
};

export default Sidebar;
