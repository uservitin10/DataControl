"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const target = `/login${window.location.hash}`;
    router.replace(target);
  }, [router]);

  return null;
}
