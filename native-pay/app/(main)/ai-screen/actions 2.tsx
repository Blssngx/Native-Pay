'use server';

import { BotCard, BotMessage } from '@/components/ui/message';
// import { Price } from '@ai-rsc/components/llm-grocery/price';
// import { PriceSkeleton } from '@ai-rsc/components/llm-grocery/price-skeleton';
// import { ProductFacts } from '@ai-rsc/components/llm-grocery/product-facts';
// import { ProductFactsSkeleton } from '@ai-rsc/components/llm-grocery/product-facts-skeleton';
import { openai } from '@ai-sdk/openai';
import type { CoreMessage, ToolInvocation } from 'ai';
import { createAI, getMutableAIState, streamUI } from 'ai/rsc';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { z } from 'zod';

// Sleep function to simulate delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const content = `\
You are a payment assistant for Native Pay. You help users make transactions using their preferred language.

Messages inside [] indicate a UI element or a user event. For example:
- "[Transaction Amount: R100]" means the user has entered the amount for the transaction.
- "[Confirm Transaction]" means the user is prompted to confirm the transaction.

Start by asking the user for their preferred language:
- "[Preferred Language: English]" indicates the user's preferred language.

If the user provides a language, proceed with the following flow:
1. Ask the user for the transaction details in their preferred language (e.g., "How much would you like to send, and to whom?")
2. Once the user provides the details (amount and recipient), generate a transaction payload using \`create_transaction_payload\`.
3. Present the transaction summary to the user and ask for confirmation (e.g., "You are about to send R100 to Blessing. Do you confirm?").
4. If the user confirms, process the transaction using \`process_transaction\`.
5. Once the transaction is complete, show a success message (e.g., "Transaction successful!").

If the user asks for something unrelated to payments, respond that you are a payment assistant for Native Pay and cannot assist with unrelated requests.

Besides handling transactions, you can also chat with users.`;

export async function sendMessage(message: string): Promise<{
  id: number;
  role: 'user' | 'assistant';
  display: ReactNode;
}> {

  const history = getMutableAIState<typeof AI>();

  history.update([
    ...history.get(),
    {
      role: 'user',
      content: message,
    },
  ]);

  const reply = await streamUI({
    model: openai('gpt-4o-2024-05-13'),
    messages: [
      {
        role: 'system',
        content,
        toolInvocations: [],
      },
      ...history.get(),
    ] as CoreMessage[],
    initial: (
      <BotMessage className="items-center flex shrink-0 select-none justify-center">
        <Loader2 className="h-5 w-5 animate-spin stroke-zinc-900" />
      </BotMessage>
    ),
    text: ({ content, done }) => {
      if (done) history.done([...history.get(), { role: 'assistant', content }]);

      return <BotMessage>{content}</BotMessage>;
    },
    temperature: 0,
  });

  return {
    id: Date.now(),
    role: 'assistant' as const,
    display: reply.value,
  };
};

// Define the AI state and UI state types
export type AIState = Array<{
  id?: number;
  name?: 'get_product_price' | 'get_product_facts';
  role: 'user' | 'assistant' | 'system';
  content: string;
}>;

export type UIState = Array<{
  id: number;
  role: 'user' | 'assistant';
  display: ReactNode;
  toolInvocations?: ToolInvocation[];
}>;

// Create the AI provider with the initial states and allowed actions
export const AI = createAI({
  initialAIState: [] as AIState,
  initialUIState: [] as UIState,
  actions: {
    sendMessage,
  },
});

