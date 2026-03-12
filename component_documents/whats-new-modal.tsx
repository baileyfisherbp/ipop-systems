"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const STORAGE_KEY = "whats-new-seen";

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  const hash = process.env.NEXT_PUBLIC_GIT_HASH || "";
  const message = process.env.NEXT_PUBLIC_GIT_MESSAGE || "";
  const gitDate = process.env.NEXT_PUBLIC_GIT_DATE || "";

  const formattedDate = gitDate
    ? new Date(gitDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  useEffect(() => {
    if (!hash) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== hash) {
      setOpen(true);
    }
  }, [hash]);

  function handleClose(isOpen: boolean) {
    if (!isOpen && hash) {
      localStorage.setItem(STORAGE_KEY, hash);
    }
    setOpen(isOpen);
  }

  if (!hash) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What&apos;s New</DialogTitle>
          <DialogDescription>
            {formattedDate && <span>{formattedDate} &middot; </span>}{hash}
          </DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-wrap text-sm">{message}</p>
      </DialogContent>
    </Dialog>
  );
}
