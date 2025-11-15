import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Sparkles, Lightbulb } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/components/common/ThemeProvider';
import { apiService } from '@/services/api';
import type { ChatCompletionMessage } from '@/services/api';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user' | 'error';
  content: string;
};

type MarkdownToken = {
  type: 'text' | 'bold' | 'italic';
  content: string;
};

const INLINE_MARKDOWN_PATTERN = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3/g;

const parseInlineMarkdown = (input: string): MarkdownToken[] => {
  if (!input) return [{ type: 'text', content: '' }];

  const tokens: MarkdownToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_MARKDOWN_PATTERN.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: input.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      tokens.push({ type: 'bold', content: match[2] });
    } else if (match[3]) {
      tokens.push({ type: 'italic', content: match[4] });
    }

    lastIndex = INLINE_MARKDOWN_PATTERN.lastIndex;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: 'text', content: input.slice(lastIndex) });
  }

  if (tokens.length === 0) {
    tokens.push({ type: 'text', content: input });
  }

  INLINE_MARKDOWN_PATTERN.lastIndex = 0;
  return tokens;
};

const renderFormattedContent = (content: string, baseColor: string): React.ReactNode[] => {
  const tokens = parseInlineMarkdown(content);
  return tokens.map((token, index) => {
    if (token.type === 'bold') {
      return (
        <Text key={`bold-${index}`} style={{ color: baseColor, fontWeight: '700' }}>
          {token.content}
        </Text>
      );
    }
    if (token.type === 'italic') {
      return (
        <Text key={`italic-${index}`} style={{ color: baseColor, fontStyle: 'italic' }}>
          {token.content}
        </Text>
      );
    }
    return <React.Fragment key={`text-${index}`}>{token.content}</React.Fragment>;
  });
};

const CHAT_SUGGESTIONS = [
  'Show me the top-performing ETFs from the last quarter',
  'Which ETFs have the lowest volatility?',
  'Suggest a diversification plan for European tech ETFs',
];

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content: 'Hi! I\'m here to help with questions about ETFs, markets, or anything you\'re curious about.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isSending]);

  const sendPrompt = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);

    setInput('');
    setIsSending(true);

    const conversationMessages: ChatCompletionMessage[] = optimisticMessages
      .filter((message): message is ChatMessage & { role: 'assistant' | 'user' } => message.role === 'assistant' || message.role === 'user')
      .map((message) => ({ role: message.role, content: message.content }));

    try {
      const assistantReply = await apiService.createChatCompletion({ messages: conversationMessages });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantReply.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error contacting chat backend', error);
      const fallbackMessage = 'We ran into a problem contacting the model. Please try again later.';
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'error',
          content: fallbackMessage,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    void sendPrompt(input);
  };

  const sendDisabled = !input.trim() || isSending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={isDark ? ['#0F172A', '#1F2937'] : ['#2563EB', '#1E40AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroIcon}>
                <Sparkles size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>ETF Assistant</Text>
                <Text style={styles.heroSubtitle}>
                  Ask about performance, volatility, or allocation strategies and I&apos;ll answer in seconds.
                </Text>
              </View>
            </LinearGradient>

            <View style={[styles.suggestionRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {CHAT_SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => void sendPrompt(suggestion)}
                  disabled={isSending}
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    pressed && styles.suggestionChipPressed,
                  ]}
                >
                  <Lightbulb size={16} color={colors.accent} />
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>

            {messages.map((message) => {
              const assistantBackground = isDark ? '#1F2933' : colors.card;
              const bubbleStyle = StyleSheet.flatten([
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : null,
                message.role === 'assistant' ? styles.assistantBubble : null,
                message.role === 'error' ? styles.errorBubble : null,
                message.role === 'user' ? { backgroundColor: colors.accent } : null,
                message.role === 'assistant'
                  ? { backgroundColor: assistantBackground, borderWidth: 1, borderColor: colors.border }
                  : null,
              ]);

              const textColor = message.role === 'user'
                ? '#FFFFFF'
                : message.role === 'assistant'
                  ? colors.text
                  : '#FFFFFF';

              return (
                <View key={message.id} style={bubbleStyle}>
                  <Text style={[styles.messageText, { color: textColor }]}>
                    {renderFormattedContent(message.content, textColor)}
                  </Text>
                </View>
              );
            })}

            {isSending && (
              <View
                style={StyleSheet.flatten([
                  styles.messageBubble,
                  styles.assistantBubble,
                  { backgroundColor: isDark ? '#1F2933' : colors.card, borderWidth: 1, borderColor: colors.border },
                ])}
              >
                <ActivityIndicator size="small" color={colors.secondaryText} />
              </View>
            )}
          </ScrollView>

          <View
            style={[
              styles.inputRow,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.card,
                paddingBottom: (insets.bottom || 0) + 6,
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Type a message"
              placeholderTextColor={colors.secondaryText}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1200}
              autoCorrect
              autoCapitalize="sentences"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: sendDisabled ? colors.border : colors.accent },
              ]}
              onPress={handleSend}
              disabled={sendDisabled}
            >
              <Send size={18} color={sendDisabled ? colors.secondaryText : '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    rowGap: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.86)',
    marginTop: 6,
    lineHeight: 18,
  },
  suggestionRow: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    rowGap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionChipPressed: {
    transform: [{ scale: 0.98 }],
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '80%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  errorBubble: {
    alignSelf: 'center',
    backgroundColor: '#B91C1C',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    columnGap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 4,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    minHeight: 44,
    maxHeight: 140,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
