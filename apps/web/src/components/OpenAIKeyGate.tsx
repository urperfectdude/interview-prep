"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { getOpenAIKey, onOpenAIKeyChange, setOpenAIKey } from "@/lib/api";

export function OpenAIKeyGate() {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    const sync = () => setHasKey(Boolean(getOpenAIKey()));
    sync();
    setChecked(true);
    return onOpenAIKeyChange(sync);
  }, []);

  if (pathname === "/" || !checked || hasKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add your OpenAI API key</CardTitle>
          <CardDescription>
            Interviews, feedback, and frame notes run on your own OpenAI account. The key stays on this device and is
            sent with each request. We never save it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="openaiKeyGate">API key</Label>
          <Input
            id="openaiKeyGate"
            type="password"
            autoComplete="off"
            autoFocus
            placeholder="sk-..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) setOpenAIKey(value.trim());
            }}
          />
        </CardContent>
        <CardFooter className="flex-wrap justify-between">
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Get a key
          </a>
          <Button onClick={() => setOpenAIKey(value.trim())} disabled={!value.trim()}>
            Save key
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
