import React, { useState, useEffect } from "react";
import {
  ChakraProvider,
  Flex,
  Box,
  IconButton,
  useColorModeValue,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Text,
  Button,
  HStack,
  VStack,
  Drawer,
  DrawerContent,
  DrawerOverlay,
} from "@chakra-ui/react";
import { HamburgerIcon, AddIcon } from "@chakra-ui/icons";

// --- API CONFIG IMPORT ---
import API_BASE_URL from "./config";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatInterface from "./components/ChatInterface";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ProfilePage from "./components/ProfilePage";

function App() {
  // --- AUTH & USER STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null,
  );
  const [allAccounts, setAllAccounts] = useState(
    JSON.parse(localStorage.getItem("accounts")) || [],
  );
  const [showAuthView, setShowAuthView] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // --- UI & NAVIGATION STATE ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [currentView, setCurrentView] = useState("chat");
  const [liveLocation, setLiveLocation] = useState("Abuja, Nigeria");

  // --- CHAT & RESEARCH STATE ---
  const [question, setQuestion] = useState("");
  const [liveAnswer, setLiveAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState("free");
  const [history, setHistory] = useState([]);
  const [activeThread, setActiveThread] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  const globalBg = useColorModeValue("white", "#1e1e1e");
  const borderColor = useColorModeValue("gray.100", "gray.700");

  // --- WINDOW RESIZE HANDLER ---
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- DATA FETCHING ---
  const fetchHistorySummaries = async () => {
    const token = localStorage.getItem("token");
    if (isLoggedIn && token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) setHistory(data);
      } catch (e) {
        console.error("History fetch error:", e);
      }
    }
  };

  useEffect(() => {
    fetchHistorySummaries();
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
          );
          const data = await res.json();
          setLiveLocation(
            `${data.address.city || data.address.town || "Abuja"}, ${data.address.country || "Nigeria"}`,
          );
        } catch (e) {
          setLiveLocation("Abuja, Nigeria");
        }
      });
    }
  }, []);

  // --- HANDLERS ---
  const handleNewResearch = () => {
    setCurrentChatId(null);
    setActiveThread([]);
    setQuestion("");
    setLiveAnswer("");
    setCurrentView("chat");
    if (isMobile) setSidebarOpen(false);
  };

  const handleHistoryClick = async (item) => {
    setCurrentView("chat");
    setCurrentChatId(item.chatId);
    setLiveAnswer("");
    if (isMobile) setSidebarOpen(false);

    if (isLoggedIn) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/history/${item.chatId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const fullThread = await res.json();
        setActiveThread(fullThread);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSearch = async () => {
    if (!question.trim()) return;
    const activeChatId = currentChatId || `chat_${Date.now()}`;
    const promptSent = question;
    const context = activeThread.flatMap((msg) => [
      { role: "user", content: msg.question },
      { role: "assistant", content: msg.answer },
    ]);
    const fullMessages = [...context, { role: "user", content: promptSent }];

    setActiveThread((prev) => [
      ...prev,
      { question: promptSent, answer: "", chatId: activeChatId },
    ]);
    setLoading(true);
    setQuestion("");
    setLiveAnswer("Connecting...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: isLoggedIn
            ? `Bearer ${localStorage.getItem("token")}`
            : "",
        },
        body: JSON.stringify({
          messages: fullMessages,
          question: promptSent,
          chatId: activeChatId,
          tier,
        }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedAnswer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.content) {
                if (accumulatedAnswer === "") setLiveAnswer("");
                accumulatedAnswer += data.content;
                setLiveAnswer(accumulatedAnswer);
              }
            } catch (e) {
              continue;
            }
          }
        }
      }
      setActiveThread((prev) => {
        const newThread = [...prev];
        newThread[newThread.length - 1].answer = accumulatedAnswer;
        return newThread;
      });
      setLiveAnswer("");
      if (!currentChatId) setCurrentChatId(activeChatId);
      fetchHistorySummaries();
    } catch (err) {
      setLiveAnswer("Error.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Delete all history?")) return;
    if (isLoggedIn) {
      await fetch(`${API_BASE_URL}/api/v1/history`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
    }
    setHistory([]);
    setActiveThread([]);
    setCurrentChatId(null);
  };

  const handleLoginSuccess = (userData) => {
    const updated = [
      ...allAccounts.filter((a) => a.email !== userData.email),
      userData,
    ];
    setAllAccounts(updated);
    setCurrentUser(userData);
    setIsLoggedIn(true);
    setShowAuthView(false);
    localStorage.setItem("accounts", JSON.stringify(updated));
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userData.token);
  };

  const switchAccount = (account) => {
    setCurrentUser(account);
    localStorage.setItem("user", JSON.stringify(account));
    localStorage.setItem("token", account.token);
    setCurrentView("chat");
    setActiveThread([]);
    setCurrentChatId(null);
  };

  const handleLogout = () => {
    const remaining = allAccounts.filter((a) => a.email !== currentUser?.email);
    setAllAccounts(remaining);
    localStorage.setItem("accounts", JSON.stringify(remaining));
    if (remaining.length > 0) {
      switchAccount(remaining[0]);
    } else {
      localStorage.clear();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setHistory([]);
    }
  };

  const sidebarContent = (
    <Sidebar
      history={history}
      onNewResearch={handleNewResearch}
      onHistoryClick={handleHistoryClick}
      onClearHistory={handleClearHistory}
      location={liveLocation}
      isLoggedIn={isLoggedIn}
      onLoginOpen={() => setShowAuthView(true)}
      onClose={() => setSidebarOpen(false)}
    />
  );

  return (
    <ChakraProvider>
      <Flex h="100vh" w="100vw" bg={globalBg} overflow="hidden">
        {showAuthView ? (
          showSignup ? (
            <Signup
              onFlip={() => setShowSignup(false)}
              onSignupSuccess={() => setShowSignup(false)}
            />
          ) : (
            <Login
              onLoginSuccess={handleLoginSuccess}
              onFlip={() => setShowSignup(true)}
              onCancel={() => setShowAuthView(false)}
            />
          )
        ) : (
          <>
            {!isMobile && (
              <Box w="260px" borderRight="1px" borderColor={borderColor}>
                {sidebarContent}
              </Box>
            )}
            {isMobile && (
              <Drawer
                isOpen={isSidebarOpen}
                placement="left"
                onClose={() => setSidebarOpen(false)}
              >
                <DrawerOverlay />
                <DrawerContent maxW="280px">{sidebarContent}</DrawerContent>
              </Drawer>
            )}

            <Flex flex={1} direction="column" w="100%" overflow="hidden">
              <Flex
                align="center"
                justify="space-between"
                borderBottom="1px"
                borderColor={borderColor}
                p={2}
                bg={globalBg}
              >
                <Flex align="center">
                  <IconButton
                    icon={<HamburgerIcon />}
                    variant="ghost"
                    onClick={() => setSidebarOpen(true)}
                    size="sm"
                    mr={2}
                    aria-label="Menu"
                  />
                  <Header />
                </Flex>
                <Box mr={2}>
                  <Menu>
                    <MenuButton
                      as={Button}
                      rounded="full"
                      variant="link"
                      minW={0}
                    >
                      <Avatar
                        size="xs"
                        name={currentUser?.name}
                        src={currentUser?.profilePic}
                        bg="blue.500"
                      />
                    </MenuButton>
                    <MenuList zIndex="1000">
                      <Box px={4} py={2}>
                        <Text fontWeight="bold" fontSize="sm">
                          {currentUser?.name || "Guest"}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {currentUser?.email || "No email"}
                        </Text>
                      </Box>
                      <MenuDivider />
                      {allAccounts
                        .filter((acc) => acc.email !== currentUser?.email)
                        .map((acc) => (
                          <MenuItem
                            key={acc.email}
                            onClick={() => switchAccount(acc)}
                          >
                            <HStack>
                              <Avatar
                                size="xs"
                                name={acc.name}
                                src={acc.profilePic}
                              />
                              <Text fontSize="xs">{acc.name}</Text>
                            </HStack>
                          </MenuItem>
                        ))}
                      <MenuItem
                        icon={<AddIcon />}
                        onClick={() => {
                          setShowAuthView(true);
                          setShowSignup(false);
                        }}
                      >
                        Add account
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem onClick={() => setCurrentView("profile")}>
                        My Profile
                      </MenuItem>
                      <MenuItem onClick={handleLogout} color="red.500">
                        Sign out
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Box>
              </Flex>

              <Box flex={1} overflowY="auto">
                {currentView === "profile" ? (
                  <ProfilePage
                    user={currentUser}
                    setCurrentUser={setCurrentUser}
                    onBack={() => setCurrentView("chat")}
                  />
                ) : (
                  <ChatInterface
                    thread={activeThread}
                    question={question}
                    setQuestion={setQuestion}
                    answer={liveAnswer}
                    loading={loading}
                    onSend={handleSearch}
                    tier={tier}
                    setTier={setTier}
                  />
                )}
              </Box>
            </Flex>
          </>
        )}
      </Flex>
    </ChakraProvider>
  );
}

export default App;
