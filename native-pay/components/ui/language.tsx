"use client";

import { Button } from "@/components/ui/button";
import { useActions, useUIState } from "ai/rsc";
import { useState } from "react";
import { RadioGroup } from '@headlessui/react';
import { AI } from "@/app/(main)/ai-screen/actions";
import { ArrowLeft, ArrowRight, ArrowUp, CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
    name: string;
    description: string;
}

const settings: Option[] = [
    { name: 'English', description: 'English' },
    { name: 'Swahili', description: 'Swahili' },
    { name: 'Zulu', description: 'Zulu' },
    { name: 'Portuguese', description: 'Portuguese' },
    { name: 'Afrikaans', description: 'Afrikaans' },
];

export default function LanguageComponent() {
    const [messages, setMessages] = useUIState<typeof AI>();
    const { sendMessage } = useActions<typeof AI>();
    const [selected, setSelected] = useState<Option | null>(null);
    const [dis, setDis] = useState(false); // Added: state to disable the RadioGroup

    const handleSubmit = async () => {
        if (!selected) return; // Guard against submitting without a selection
        const value = selected.description;
        if (!value) return;

        // Add user message UI
        setMessages((currentMessages: any) => [
            ...currentMessages,
            {
                id: Date.now(),
                role: "user",
                display: <></>,

                // <ResponseSubmitted> {selected.name}</ResponseSubmitted>,
            },
        ]);

        try {
            setDis(true); // Disable selection after submission
            // Submit and get response message
            const responseMessage = await sendMessage(value);
            setMessages((currentMessages: any) => [
                ...currentMessages,
                responseMessage,
            ]);

        } catch (error) {
            console.error("Error submitting message:", error);
        }
    };

    return (
        <>
      <div className="group relative flex-end items-start md:-ml-16">
                <div className="mx-auto">
                    <fieldset aria-label="Select an option">
                        <RadioGroup
                            value={selected}
                            onChange={setSelected}
                            className="space-y-1 rounded-md "
                            disabled={dis} // Disable RadioGroup when `dis` is true
                        >
                            {settings.map((setting, settingIdx) => (
                                <RadioGroup.Option
                                    key={setting.name}
                                    value={setting}
                                    className="group relative block cursor-pointer rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm focus:outline-none data-[focus]:border-green-300 data-[focus]:ring-2 data-[focus]:ring-indigo-600 sm:flex sm:justify-between"
                                >
                                    {({ checked }) => (
                                        <>
                                            <span className="ml-3 flex flex-col">
                                                <span className={cn('block text-sm font-medium text-gray-900', checked ? 'text-green-800 font-bold text-xl' : 'text-black')}>
                                                    {setting.name}
                                                </span>
                                            </span>
                                            <span
                                                aria-hidden="true"
                                                className="pointer-events-none absolute -inset-px rounded-lg border-2 border-transparent group-data-[focus]:border group-data-[checked]:border-[#A479FF]"
                                            />
                                        </>
                                    )}
                                </RadioGroup.Option>
                            ))}
                        </RadioGroup>
                    </fieldset>

                    <div className="mt-2 ">
                        <Button
                            onClick={handleSubmit}
                            variant={'secondary'}
                            className="bg-gray-300 w-full rounded-full"
                            disabled={!selected || dis} // Disable button if no selection or already submitted
                        >
                            <span>Next</span>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}