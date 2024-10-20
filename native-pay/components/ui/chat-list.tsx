import type { UIState } from "@/app/(main)/ai-screen/actions";
import LanguageComponent from "./language";

export function ChatList({ messages }: { messages: UIState[number][]; }) {
  // if (!messages.length) return null;

  return (
    <div className="relative mx-auto max-w-2xl px-4 bg-[#470c6e]">
      <LanguageComponent/>
      {messages.map((message, index) => (
        <div key={index} className="pb-4">
          {message.display}
        </div>
      ))}
    </div>
  );
}
