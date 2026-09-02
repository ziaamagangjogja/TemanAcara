// src/lib/chatEngine.ts

import { ChatMessage } from "./chatStore";
import { getMitraByTalentId } from './mitraStore';

/**
 * Generate response for chat - HANYA MANUAL RESPONSE ONLY
 * No auto-response, no bot interference
 */
export function generateContextualResponse(
  currentMessage: string,
  messageHistory: ChatMessage[],
  talentName: string,
  talentId: string
): string | null {
  // ✅ HANYA ADA AKUN MITRA, TUNGGU MANUAL RESPONSE
  return null;
}
