import { cn } from "@/lib/utils";
import { Sparkle, UserIcon } from 'lucide-react';

// Different types of message bubbles.
export function UserMessage({ children }: { children: React.ReactNode; }) {
  return (
    <div className="group relative flex-end items-start md:-ml-16">
      <div className="ml-4 text-pretty  flex-1 text-2xl space-y-2 overflow-hidden px-1">
        {children}
      </div>
    </div>
  );
}

export function BotMessage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('group bg-black/30 rounded p-2  relative flex items-start md:-ml-16', className)}>
      <div className="ml-4 font-bold text-pretty text-2xl flex-1 space-y-2 overflow-hidden px-1">
        {children}
      </div>
    </div>
  );
}

export function BotCard({
  children,
  showAvatar = true,
}: {
  children: React.ReactNode;
  showAvatar?: boolean;
}) {
  return (
    <div className="group bg-black/30 rounded relative flex items-start md:-ml-12">
      <div className="ml-4 flex-1 px-1">{children}</div>
    </div>
  );
}

export function AssistantMessage({ children }: { children: React.ReactNode; }) {
  return (
    <div
      className={
        'mt-2 flex items-center justify-center gap-2 text-xs text-gray-500'
      }
    >
      <div className={'max-w-[600px] flex-initial px-2 py-2'}>{children}</div>
    </div>
  );
}
