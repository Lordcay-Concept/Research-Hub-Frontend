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
  useBreakpointValue,
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
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

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

  // --- CHAT HANDLERS ---
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
        console.error("Thread fetch error:", e);
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
    setLiveAnswer("Connecting to Research Hub Stream...");

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

      if (!res.ok) throw new Error("Server connection failed");

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
                if (accumulatedAnswer === "") {
                  setLiveAnswer("");
                }
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
      console.error(err);
      setLiveAnswer("Error connecting to server. Please check your backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Delete all research history?")) return;
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

  // --- AUTH & ACCOUNT SWITCHING ---
  const handleLoginSuccess = (userData) => {
    const updatedAccounts = [
      ...allAccounts.filter((a) => a.email !== userData.email),
      userData,
    ];
    setAllAccounts(updatedAccounts);
    setCurrentUser(userData);
    setIsLoggedIn(true);
    setShowAuthView(false);
    setActiveThread([]);
    setCurrentChatId(null);
    setLiveAnswer("");

    localStorage.setItem("accounts", JSON.stringify(updatedAccounts));
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
    setLiveAnswer("");
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
      setActiveThread([]);
      setHistory([]);
      setCurrentView("chat");
    }
  };

  return (
    <ChakraProvider>
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
        <Flex h="100vh" w="100vw" bg={globalBg} overflow="hidden">
          <Box
            display={isSidebarOpen ? "block" : "none"}
            position={isMobile ? "absolute" : "relative"}
            zIndex={isMobile ? "100" : "1"}
            h="100%"
            bg={globalBg}
          >
            <Sidebar
              history={history}
              onNewResearch={handleNewResearch}
              onHistoryClick={handleHistoryClick}
              onClearHistory={handleClearHistory}
              location={liveLocation}
              isLoggedIn={isLoggedIn}
              onLoginOpen={() => setShowAuthView(true)}
              onClose={() => isMobile && setSidebarOpen(false)}
            />
          </Box>

          <Flex flex={1} direction="column" w="100%">
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
                  onClick={() => setSidebarOpen(!isSidebarOpen)}
                  size="sm"
                  mr={2}
                  aria-label="Toggle Sidebar"
                />
                <Header />
              </Flex>

              <Box mr={2}>
                <Menu>
                  <MenuButton
                    as={Button}
                    rounded="full"
                    variant="link"
                    cursor="pointer"
                    minW={0}
                  >
                    <Avatar
                      size="xs"
                      name={currentUser?.name}
                      src={currentUser?.profilePic}
                      bg="blue.500"
                      color="white"
                    />
                  </MenuButton>
                  <MenuList zIndex="20">
                    <Box px={4} py={2}>
                      <Text fontWeight="bold" fontSize="sm">
                        {currentUser?.name || "Guest User"}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {currentUser?.email || "No email linked"}
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
                            <VStack align="start" spacing={0}>
                              <Text fontSize="xs" fontWeight="medium">
                                {acc.name}
                              </Text>
                              <Text fontSize="10px" color="gray.500">
                                {acc.email}
                              </Text>
                            </VStack>
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
                      Add another account
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem onClick={() => setCurrentView("profile")}>
                      My Profile
                    </MenuItem>
                    <MenuDivider />
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
        </Flex>
      )}
    </ChakraProvider>
  );
}

export default App;
