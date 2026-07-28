export enum InteractionType {
  PING = 1,
  APPLICATION_COMMAND = 2,
  MESSAGE_COMPONENT = 3,
  MODAL_SUBMIT = 5,
}

export enum InteractionCallbackType {
  PONG = 1,
  CHANNEL_MESSAGE_WITH_SOURCE = 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
}

/** Discord message flag: only the invoking user sees the reply. */
export const EPHEMERAL = 1 << 6;

export interface CommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
}

export interface Interaction {
  id: string;
  application_id: string;
  type: InteractionType;
  token: string;
  guild_id?: string;
  channel_id?: string;
  member?: { user: DiscordUser };
  user?: DiscordUser;
  data?: {
    name: string;
    options?: CommandOption[];
  };
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
}

export interface InteractionResponse {
  type: InteractionCallbackType;
  data?: {
    content?: string;
    flags?: number;
  };
}
