export interface Interaction {
  interactionId: string;
  guildId: string;
  channelId: string | null;
  userId: string;
  username: string;
  command: string;
  options: Record<string, unknown>;
  mirrorStatus: "pending" | "sent" | "failed" | "skipped";
  mirrorError: string | null;
  createdAt: string;
}

export interface CommandConfig {
  command: string;
  enabled: boolean;
  mirrorEnabled: boolean;
  replyTemplate: string | null;
  updatedAt: string;
}

export interface Stats {
  total: number;
  byCommand: Record<string, number>;
  mirrorFailed: number;
}
