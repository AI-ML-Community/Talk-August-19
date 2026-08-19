"use client";

import * as React from "react";
import { Check, Code2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LANGUAGES, type LanguageId } from "@/lib/modes";
import { cn } from "@/lib/utils";

interface CodeDialogProps {
  title: string;
  description: string;
  // Pre-highlighted HTML per language, rendered on the server so shiki's
  // grammars never reach the browser bundle. See src/lib/highlight.ts.
  html: Record<LanguageId, string>;
  // Raw source per language, kept only so the copy button yields real code
  // rather than the highlighted markup.
  raw: Record<LanguageId, string>;
  label?: string;
}

export function CodeDialog({
  title,
  description,
  html,
  raw,
  label = "View code",
}: CodeDialogProps) {
  const [lang, setLang] = React.useState<LanguageId>("curl");
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    await navigator.clipboard.writeText(raw[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="gap-2" />}
      >
        <Code2 className="size-3.5" />
        {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/40 pr-2">
            <div className="flex overflow-x-auto">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  className={cn(
                    "whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors duration-150",
                    lang === l.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "rounded-md px-2 py-1",
                      lang === l.id && "bg-background shadow-sm",
                    )}
                  >
                    {l.label}
                  </span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={copy}
              aria-label="Copy code"
              className="size-8 shrink-0 text-muted-foreground"
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </div>
          <div
            className="max-h-[55vh] overflow-auto bg-background [&_pre]:bg-transparent! [&_pre]:p-5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:leading-[1.7]"
            dangerouslySetInnerHTML={{ __html: html[lang] }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SingleCodeDialogProps {
  title: string;
  description: string;
  html: string;
  raw: string;
  label?: string;
}

// Used where only one language makes sense — reading usage off the response.
export function SingleCodeDialog({
  title,
  description,
  html,
  raw,
  label = "Code",
}: SingleCodeDialogProps) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    await navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="gap-2" />}
      >
        <Code2 className="size-3.5" />
        {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border">
          <div className="flex justify-end border-b bg-muted/40 px-2 py-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={copy}
              aria-label="Copy code"
              className="size-7 text-muted-foreground"
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </div>
          <div
            className="max-h-[55vh] overflow-auto [&_pre]:bg-transparent! [&_pre]:p-5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:leading-[1.7]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
