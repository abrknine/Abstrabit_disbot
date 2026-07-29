export interface Interaction {
  id: number;
  interactionId: string;
  guildId: string;
  channelId: string | null;
  userId: string;
  username: string;
  command: string;
  options: Record<string, unknown>;
  status: "n/a" | "open" | "in_progress" | "resolved";
  claimedBy: string | null;
  aiSummary: string | null;
  aiCategory: string | null;
  aiPriority: string | null;
  mirrorStatus: "pending" | "sent" | "failed" | "skipped";
  mirrorError: string | null;
  createdAt: string;
}

export interface CommandConfig {
  command: string;
  enabled: boolean;
  mirrorEnabled: boolean;
  aiEnabled: boolean;
  replyTemplate: string | null;
  updatedAt: string;
}

export interface ConnectedGuild {
  guildId: string;
  name: string;
  icon: string | null;
  mirrorChannelId: string | null;
  mirrorWebhookUrl: string | null;
  connectedAt: string;
}

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
}

export interface Stats {
  total: number;
  byCommand: Record<string, number>;
  mirrorFailed: number;
  openTickets: number;
  inProgress: number;
  highPriorityOpen: number;
}
