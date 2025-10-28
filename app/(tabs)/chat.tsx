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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { useTheme } from '@/components/common/ThemeProvider';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user' | 'error';
  content: string;
};

type OpenAIMessage = {
  role: 'system' | 'assistant' | 'user';
  content: string;
};

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ;
const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL ;

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content: 'Ciao! Sono qui per aiutarti con domande su ETF, mercati o qualsiasi curiosità tu abbia.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isSending]);

  const handleSend = async () => {
    const trimmed = input.trim();
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

    if (!OPENAI_API_KEY) {
      setMessages([
        ...optimisticMessages,
        {
          id: `error-${Date.now()}`,
          role: 'error',
          content: 'Configura EXPO_PUBLIC_OPENAI_API_KEY nel file .env.',
        },
      ]);
      return;
    }

    setIsSending(true);

    // Serialize the conversation for the OpenAI Chat Completions endpoint
    const payloadMessages: OpenAIMessage[] = [
      {
        role: 'system',
        content: 'Sei un assistente fintech che risponde in italiano in modo conciso e utile.',
      },
      ...optimisticMessages
        .filter((message): message is ChatMessage & { role: 'assistant' | 'user' } => message.role !== 'error')
        .map((message) => ({ role: message.role, content: message.content })),
    ];

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: payloadMessages,
          temperature: 0.3,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data?.choices?.[0]?.message?.content?.trim();

      if (!assistantContent) {
        throw new Error('Risposta del modello vuota');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Errore nella chat con OpenAI', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'error',
          content: 'Si è verificato un problema nel contattare il modello. Riprova più tardi.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
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
            contentContainerStyle={styles.messagesContainer}
            keyboardShouldPersistTaps="handled"
          >
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
                  <Text style={[styles.messageText, { color: textColor }]}>{message.content}</Text>
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

          <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.card }]}> 
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Scrivi un messaggio"
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
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 40,
    maxHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});